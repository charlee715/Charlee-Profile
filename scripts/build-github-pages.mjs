import { access, cp, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const repositoryName = process.env.GITHUB_REPOSITORY?.split("/").at(-1) ?? "Charlee-Profile";

process.env.GITHUB_PAGES = "true";
process.env.NEXT_PUBLIC_BASE_PATH = `/${repositoryName}`;

const playlistPath = resolve(process.cwd(), "public", "music", "playlist.json");
const sourcePlaylist = await readFile(playlistPath, "utf8").catch(() => null);

await import("./generate-music-manifest.mjs");

const vinextCli = resolve(process.cwd(), "node_modules", "vinext", "dist", "cli.js");
const build = spawnSync(process.execPath, [vinextCli, "build"], {
  cwd: process.cwd(),
  env: process.env,
  stdio: "inherit",
});

let buildFailure = null;

if (build.status !== 0) {
  const staticIndex = resolve(process.cwd(), "dist", "client", "index.html");
  const windowsShutdownAssertion = process.platform === "win32"
    && await access(staticIndex).then(() => true, () => false);

  if (!windowsShutdownAssertion) buildFailure = build.status ?? 1;
  else console.warn("[pages] Vinext exited during Windows prerender shutdown; verified static output and continuing.");
}

const clientOutput = resolve(process.cwd(), "dist", "client");
const prefixedNextOutput = resolve(clientOutput, repositoryName, "_next");
const pagesNextOutput = resolve(clientOutput, "_next");

// GitHub Pages already mounts the artifact at /<repository>. Vinext also uses
// assetPrefix as its emitted directory, so flatten that extra repository layer
// while keeping the URLs in index.html correctly prefixed.
if (buildFailure === null && await access(prefixedNextOutput).then(() => true, () => false)) {
  await cp(prefixedNextOutput, pagesNextOutput, { recursive: true });
}

if (buildFailure === null) {
  await writeFile(resolve(clientOutput, ".nojekyll"), "", "utf8");
}

if (sourcePlaylist !== null) {
  await writeFile(playlistPath, sourcePlaylist, "utf8");
}

if (buildFailure !== null) process.exit(buildFailure);
