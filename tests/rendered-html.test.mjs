import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function renderHomePage() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the complete profile", async () => {
  const response = await renderHomePage();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html[^>]+lang="en"/i);
  assert.match(html, /Charlee/i);
  assert.match(html, /Profile 2026/i);
  assert.match(html, /Publications/i);
  assert.match(html, /Awards/i);
  assert.match(html, /Xiaoduo Li/i);
  assert.doesNotMatch(html, /Your site is taking shape|codex-preview/i);
});

test("build creates a valid music manifest", async () => {
  const manifestUrl = new URL("../public/music/playlist.json", import.meta.url);
  const playlist = JSON.parse(await readFile(manifestUrl, "utf8"));

  assert.ok(Array.isArray(playlist));
  assert.ok(playlist.length > 0);
  for (const track of playlist) {
    assert.equal(typeof track.title, "string");
    assert.match(track.src, /^\/music\//);
  }
});
