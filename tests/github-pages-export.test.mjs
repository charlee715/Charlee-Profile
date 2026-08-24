import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const output = new URL("../dist/client/", import.meta.url);
const [repositoryOwner = "charlee715", repositoryName = "Charlee-Profile"] =
  (process.env.GITHUB_REPOSITORY ?? "charlee715/Charlee-Profile").split("/");
const isUserSite = repositoryName.toLowerCase() === `${repositoryOwner}.github.io`.toLowerCase();
const basePath = isUserSite ? "" : `/${repositoryName}`;

test("exports the profile under the correct GitHub Pages path", async () => {
  const html = await readFile(new URL("index.html", output), "utf8");
  assert.match(html, /Charlee/i);
  assert.ok(html.includes(`${basePath}/_next/`));
  assert.ok(html.includes(`${basePath}/favicon.svg`));

  const localAssets = [...html.matchAll(/(?:href|src)="(\/[^"?#]+)"/g)]
    .map(([, pathname]) => {
      const withoutBasePath = basePath && pathname.startsWith(`${basePath}/`)
        ? pathname.slice(basePath.length)
        : pathname;
      return decodeURIComponent(withoutBasePath.replace(/^\//, ""));
    });

  assert.ok(localAssets.length > 0);
  await Promise.all(localAssets.map((pathname) => access(new URL(pathname, output))));
});

test("copies public assets and disables Jekyll processing", async () => {
  await access(new URL(".nojekyll", output));
  await access(new URL("_next/static/", output));
  await access(new URL("images/contact-background-charlee-final.png", output));
  await access(new URL("music/Exploration%20Theme.wav", output));

  const playlist = JSON.parse(await readFile(new URL("music/playlist.json", output), "utf8"));
  assert.equal(playlist[0].src, `${basePath}/music/Exploration%20Theme.wav`);
});
