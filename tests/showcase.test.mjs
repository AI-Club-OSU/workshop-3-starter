import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

async function render(path = "/", headers = {}) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${path}`, {
      headers: { accept: "text/html", ...headers },
    }),
    {
      ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
    },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the Workshop 3 showcase and sign-in state", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Workshop 3 Showcase \| AI Club at Oregon State<\/title>/i);
  assert.match(html, /Small ideas\./);
  assert.match(html, /Live websites\./);
  assert.match(html, /Sign in with ChatGPT/);
  assert.match(html, /Participant gallery/);
  assert.match(html, /\/signin-with-chatgpt\?return_to=%2F/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
  assert.doesNotMatch(html, /og:image|twitter:image/i);
});

test("keeps identity and ownership checks on server routes", async () => {
  const [metadataRoute, submissionsRoute, meRoute, schema] = await Promise.all([
    readFile(new URL("../app/api/metadata/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/submissions/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/submissions/me/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
  ]);

  assert.match(metadataRoute, /await getChatGPTUser\(\)/);
  assert.match(submissionsRoute, /ownerUserId:\s*user\.userId/);
  assert.match(submissionsRoute, /findSubmissionByOwner\(user\.userId\)/);
  assert.match(meRoute, /findSubmissionByOwner\(user\.userId\)/);
  assert.match(schema, /uniqueIndex\("idx_submissions_owner_user_id"\)/);
});

test("includes a generated migration with the one-submission constraint", async () => {
  const files = (await readdir(new URL("../drizzle/", import.meta.url))).filter(
    (file) => file.endsWith(".sql"),
  );
  assert.equal(files.length, 1);
  const sql = await readFile(new URL(`../drizzle/${files[0]}`, import.meta.url), "utf8");
  assert.match(sql, /CREATE TABLE [`"]submissions[`"]/i);
  assert.match(sql, /CREATE UNIQUE INDEX [`"]idx_submissions_owner_user_id[`"]/i);
  assert.match(sql, /PRAGMA optimize;/i);
});
