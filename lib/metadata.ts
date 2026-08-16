import type { SubmissionMetadata } from "./types";

const MAX_HTML_BYTES = 512 * 1024; // 512 KB
const FETCH_TIMEOUT_MS = 8 * 1000; // 8 seconds
const MAX_REDIRECTS = 3;
const MAX_TEXT_LENGTH = 500;
const ALLOWED_PORTS = new Set(["", "80", "443"]);

export class MetadataFetchError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export async function fetchSiteMetadata(rawUrl: string): Promise<SubmissionMetadata> {
  const initialUrl = normalizePublicUrl(rawUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    let currentUrl = initialUrl;

    for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
      await assertPublicDestination(currentUrl, controller.signal);

      let response: Response;
      try {
        response = await fetch(currentUrl, {
          redirect: "manual",
          signal: controller.signal,
          headers: {
            Accept: "text/html,application/xhtml+xml;q=0.9",
          },
        });
      } catch {
        if (controller.signal.aborted) {
          throw new MetadataFetchError(
            "That site took too long to respond. Try again in a moment.",
            408,
          );
        }
        throw new MetadataFetchError(
          "We could not reach that website. Check that it is publicly available.",
          422,
        );
      }

      if (isRedirect(response.status)) {
        if (redirectCount === MAX_REDIRECTS) {
          throw new MetadataFetchError("That website redirected too many times.", 422);
        }
        const location = response.headers.get("location");
        if (!location) {
          throw new MetadataFetchError("That website returned an invalid redirect.", 422);
        }
        currentUrl = normalizePublicUrl(new URL(location, currentUrl).href);
        continue;
      }

      if (!response.ok) {
        throw new MetadataFetchError(
          `That website returned HTTP ${response.status}. Make sure it is published and public.`,
          422,
        );
      }

      const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
      if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
        throw new MetadataFetchError("That URL does not appear to be an HTML website.", 422);
      }

      const html = await readLimitedHtml(response);
      return extractMetadata(html, currentUrl);
    }

    throw new MetadataFetchError("That website could not be previewed.", 422);
  } finally {
    clearTimeout(timeout);
  }
}

function normalizePublicUrl(rawUrl: string): URL {
  const candidate = rawUrl.trim();
  if (!candidate) throw new MetadataFetchError("Enter a website URL first.");
  if (candidate.length > 2048) throw new MetadataFetchError("That URL is too long.");

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    throw new MetadataFetchError("Enter a complete URL beginning with http:// or https://.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new MetadataFetchError("Only public http:// and https:// websites can be submitted.");
  }
  if (url.username || url.password) {
    throw new MetadataFetchError("URLs containing usernames or passwords are not supported.");
  }
  if (!url.hostname) throw new MetadataFetchError("That URL is missing a hostname.");
  if (!ALLOWED_PORTS.has(url.port)) {
    throw new MetadataFetchError("Only standard public website ports can be previewed.");
  }
  if (isBlockedHostname(url.hostname)) {
    throw new MetadataFetchError("Local and private network addresses cannot be previewed.");
  }

  url.hash = "";
  return url;
}

async function assertPublicDestination(url: URL, signal: AbortSignal): Promise<void> {
  const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (isBlockedHostname(hostname)) {
    throw new MetadataFetchError("Local and private network addresses cannot be previewed.");
  }

  if (isIpAddress(hostname)) {
    if (isPrivateIp(hostname)) {
      throw new MetadataFetchError("Local and private network addresses cannot be previewed.");
    }
    return;
  }

  const resolvedAddresses = await resolveAddresses(hostname, signal);
  if (resolvedAddresses.length === 0) {
    throw new MetadataFetchError("That domain could not be resolved on the public internet.", 422);
  }
  if (resolvedAddresses.some(isPrivateIp)) {
    throw new MetadataFetchError("Local and private network addresses cannot be previewed.");
  }
}

async function resolveAddresses(hostname: string, signal: AbortSignal): Promise<string[]> {
  try {
    const records = await Promise.all(
      ["A", "AAAA"].map(async (type) => {
        const endpoint = new URL("https://cloudflare-dns.com/dns-query");
        endpoint.searchParams.set("name", hostname);
        endpoint.searchParams.set("type", type);
        const response = await fetch(endpoint, {
          signal,
          headers: { Accept: "application/dns-json" },
        });
        if (!response.ok) return [];
        const payload = (await response.json()) as {
          Answer?: Array<{ type: number; data: string }>;
        };
        return (payload.Answer ?? [])
          .filter((answer) => answer.type === 1 || answer.type === 28)
          .map((answer) => answer.data);
      }),
    );
    return records.flat();
  } catch {
    if (signal.aborted) {
      throw new MetadataFetchError(
        "That site took too long to respond. Try again in a moment.",
        408,
      );
    }
    throw new MetadataFetchError("We could not safely verify that website's address.", 422);
  }
}

function isIpAddress(hostname: string): boolean {
  return isIpv4(hostname) || hostname.includes(":");
}

function isIpv4(value: string): boolean {
  const parts = value.split(".");
  return (
    parts.length === 4 &&
    parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) >= 0 && Number(part) <= 255)
  );
}

function isPrivateIp(value: string): boolean {
  const hostname = value.replace(/^\[|\]$/g, "").toLowerCase();
  if (isIpv4(hostname)) {
    const [a, b, c] = hostname.split(".").map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 0 && c === 0) ||
      (a === 192 && b === 0 && c === 2) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19)) ||
      (a === 198 && b === 51 && c === 100) ||
      (a === 203 && b === 0 && c === 113) ||
      a >= 224
    );
  }

  const words = parseIpv6(hostname);
  if (!words) return true;

  const isUnspecified = words.every((word) => word === 0);
  const isLoopback = words.slice(0, 7).every((word) => word === 0) && words[7] === 1;
  const isUniqueLocal = (words[0] & 0xfe00) === 0xfc00;
  const isLinkLocal = (words[0] & 0xffc0) === 0xfe80;
  const isMulticast = (words[0] & 0xff00) === 0xff00;
  const isDocumentation = words[0] === 0x2001 && words[1] === 0x0db8;
  const isTeredo = words[0] === 0x2001 && words[1] === 0;
  const isSixToFour = words[0] === 0x2002;
  const isIpv4Mapped =
    words.slice(0, 5).every((word) => word === 0) && words[5] === 0xffff;

  if (isIpv4Mapped) {
    return isPrivateIp(
      `${words[6] >> 8}.${words[6] & 255}.${words[7] >> 8}.${words[7] & 255}`,
    );
  }

  return (
    isUnspecified ||
    isLoopback ||
    isUniqueLocal ||
    isLinkLocal ||
    isMulticast ||
    isDocumentation ||
    isTeredo ||
    isSixToFour
  );
}

function isBlockedHostname(value: string): boolean {
  const hostname = value.replace(/^\[|\]$/g, "").toLowerCase().replace(/\.$/, "");
  return (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".home") ||
    hostname.endsWith(".lan") ||
    hostname.endsWith(".onion") ||
    (isIpAddress(hostname) && isPrivateIp(hostname))
  );
}

function parseIpv6(value: string): number[] | null {
  const normalized = value.replace(/^\[|\]$/g, "").toLowerCase().split("%")[0];
  if (!normalized.includes(":")) return null;

  const doubleColonParts = normalized.split("::");
  if (doubleColonParts.length > 2) return null;

  const parsePart = (part: string): number[] | null => {
    if (!part) return [];
    const output: number[] = [];
    for (const segment of part.split(":")) {
      if (segment.includes(".")) {
        if (!isIpv4(segment)) return null;
        const bytes = segment.split(".").map(Number);
        output.push((bytes[0] << 8) | bytes[1], (bytes[2] << 8) | bytes[3]);
      } else {
        if (!/^[0-9a-f]{1,4}$/.test(segment)) return null;
        output.push(parseInt(segment, 16));
      }
    }
    return output;
  };

  const left = parsePart(doubleColonParts[0]);
  const right = parsePart(doubleColonParts[1] ?? "");
  if (!left || !right) return null;

  if (doubleColonParts.length === 1) {
    return left.length === 8 ? left : null;
  }
  const missing = 8 - left.length - right.length;
  if (missing < 1) return null;
  return [...left, ...Array<number>(missing).fill(0), ...right];
}

function isRedirect(status: number): boolean {
  return status === 301 || status === 302 || status === 303 || status === 307 || status === 308;
}

async function readLimitedHtml(response: Response): Promise<string> {
  const declaredSize = Number(response.headers.get("content-length") ?? 0);
  if (declaredSize > MAX_HTML_BYTES) {
    throw new MetadataFetchError("That page is too large to preview. Keep the homepage HTML under 512 KB.", 413);
  }
  if (!response.body) throw new MetadataFetchError("That website returned an empty page.", 422);

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let html = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_HTML_BYTES) {
      await reader.cancel();
      throw new MetadataFetchError("That page is too large to preview. Keep the homepage HTML under 512 KB.", 413);
    }
    html += decoder.decode(value, { stream: true });
  }

  return html + decoder.decode();
}

function extractMetadata(html: string, finalUrl: URL): SubmissionMetadata {
  const meta = new Map<string, string>();
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const attributes = parseAttributes(tag);
    const key = (attributes.property ?? attributes.name ?? "").toLowerCase();
    const value = attributes.content;
    if (key && value && !meta.has(key)) meta.set(key, cleanText(value));
  }

  let canonicalUrl: string | null = null;
  for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
    const attributes = parseAttributes(tag);
    const relationships = (attributes.rel ?? "").toLowerCase().split(/\s+/);
    if (relationships.includes("canonical") && attributes.href) {
      canonicalUrl = safeAbsoluteHttpUrl(attributes.href, finalUrl);
      if (canonicalUrl) break;
    }
  }

  const titleMatch = html.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i);
  const title = titleMatch ? cleanText(titleMatch[1].replace(/<[^>]+>/g, " ")) : null;

  return {
    url: finalUrl.href,
    hostname: finalUrl.hostname.replace(/^www\./, ""),
    title: title || null,
    description: meta.get("description") || null,
    openGraphTitle: meta.get("og:title") || null,
    openGraphDescription: meta.get("og:description") || null,
    twitterTitle: meta.get("twitter:title") || null,
    twitterDescription: meta.get("twitter:description") || null,
    canonicalUrl,
    siteName: meta.get("og:site_name") || null,
  };
}

function parseAttributes(tag: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  const pattern = /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;
  for (const match of tag.matchAll(pattern)) {
    attributes[match[1].toLowerCase()] = decodeHtml(match[2] ?? match[3] ?? match[4] ?? "");
  }
  return attributes;
}

function safeAbsoluteHttpUrl(value: string, base: URL): string | null {
  try {
    const url = new URL(value, base);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (
      url.username ||
      url.password ||
      !ALLOWED_PORTS.has(url.port) ||
      isBlockedHostname(url.hostname)
    ) return null;
    url.hash = "";
    return url.href;
  } catch {
    return null;
  }
}

function cleanText(value: string): string {
  return decodeHtml(value).replace(/\s+/g, " ").trim().slice(0, MAX_TEXT_LENGTH);
}

function decodeHtml(value: string): string {
  const named: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };
  return value.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, code: string) => {
    if (code[0] === "#") {
      const numeric = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(numeric) && numeric > 0 && numeric <= 0x10ffff
        ? String.fromCodePoint(numeric)
        : entity;
    }
    return named[code.toLowerCase()] ?? entity;
  });
}
