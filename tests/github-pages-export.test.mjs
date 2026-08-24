import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const output = new URL("../dist/client/", import.meta.url);

test("exports the profile under the repository base path", async () => {
  const html = await readFile(new URL("index.html", output), "utf8");
  assert.match(html, /Charlee/i);
  assert.match(html, /\/Charlee-Profile\/_next\//);
  assert.match(html, /\/Charlee-Profile\/favicon\.svg/);
});

test("copies public assets and disables Jekyll processing", async () => {
  await access(new URL(".nojekyll", output));
  await access(new URL("images/contact-background-charlee-final.png", output));
  await access(new URL("music/Exploration%20Theme.wav", output));

  const playlist = JSON.parse(await readFile(new URL("music/playlist.json", output), "utf8"));
  assert.equal(playlist[0].src, "/Charlee-Profile/music/Exploration%20Theme.wav");
});
