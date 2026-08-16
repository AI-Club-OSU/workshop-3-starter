import assert from "node:assert/strict";
import test from "node:test";
import { fetchSiteMetadata, MetadataFetchError } from "../lib/metadata.ts";

test("rejects local, private, and nonstandard destinations before fetching", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    throw new Error("fetch should not run");
  };

  try {
    for (const url of [
      "http://127.0.0.1",
      "http://[::1]",
      "http://localhost",
      "https://project.local",
      "https://example.com:8443",
      "ftp://example.com",
    ]) {
      await assert.rejects(
        fetchSiteMetadata(url),
        (error) => error instanceof MetadataFetchError && error.status === 400,
      );
    }
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("extracts requested website and social metadata", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = new URL(input instanceof Request ? input.url : input);
    if (url.hostname === "cloudflare-dns.com") {
      const type = url.searchParams.get("type");
      return Response.json({
        Answer: type === "A" ? [{ type: 1, data: "93.184.216.34" }] : [],
      });
    }

    return new Response(
      `<!doctype html><html><head>
        <title>HTML &amp; title</title>
        <meta name="description" content="Standard description">
        <meta property="og:title" content="Open Graph title">
        <meta property="og:description" content="Open Graph description">
        <meta property="og:site_name" content="Workshop Project">
        <meta name="twitter:title" content="X title">
        <meta name="twitter:description" content="X description">
        <link rel="canonical" href="/home">
      </head></html>`,
      { headers: { "content-type": "text/html; charset=utf-8" } },
    );
  };

  try {
    const metadata = await fetchSiteMetadata("https://example.com/project#demo");
    assert.deepEqual(metadata, {
      url: "https://example.com/project",
      hostname: "example.com",
      title: "HTML & title",
      description: "Standard description",
      openGraphTitle: "Open Graph title",
      openGraphDescription: "Open Graph description",
      twitterTitle: "X title",
      twitterDescription: "X description",
      canonicalUrl: "https://example.com/home",
      siteName: "Workshop Project",
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("validates every redirect destination", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = new URL(input instanceof Request ? input.url : input);
    if (url.hostname === "cloudflare-dns.com") {
      return Response.json({ Answer: [{ type: 1, data: "93.184.216.34" }] });
    }
    return new Response(null, {
      status: 302,
      headers: { location: "http://169.254.169.254/latest/meta-data" },
    });
  };

  try {
    await assert.rejects(
      fetchSiteMetadata("https://example.com"),
      (error) =>
        error instanceof MetadataFetchError &&
        /private network addresses/.test(error.message),
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("rejects oversized HTML before reading the body", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = new URL(input instanceof Request ? input.url : input);
    if (url.hostname === "cloudflare-dns.com") {
      return Response.json({ Answer: [{ type: 1, data: "93.184.216.34" }] });
    }
    return new Response("<html></html>", {
      headers: {
        "content-type": "text/html",
        "content-length": String(513 * 1024),
      },
    });
  };

  try {
    await assert.rejects(
      fetchSiteMetadata("https://example.com"),
      (error) => error instanceof MetadataFetchError && error.status === 413,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
