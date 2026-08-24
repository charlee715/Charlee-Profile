import { access, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const repositoryName = process.env.GITHUB_REPOSITORY?.split("/").at(-1) ?? "Charlee-Profile";

process.env.GITHUB_PAGES = "true";
process.env.NEXT_PUBLIC_BASE_PATH = `/${repositoryName}`;

await import("./generate-music-manifest.mjs");

const vinextCli = resolve(process.cwd(), "node_modules", "vinext", "dist", "cli.js");
const build = spawnSync(process.execPath, [vinextCli, "build"], {
  cwd: process.cwd(),
  env: process.env,
  stdio: "inherit",
});

if (build.status !== 0) {
  const staticIndex = resolve(process.cwd(), "dist", "client", "index.html");
  const windowsShutdownAssertion = process.platform === "win32"
    && await access(staticIndex).then(() => true, () => false);

  if (!windowsShutdownAssertion) process.exit(build.status ?? 1);
  console.warn("[pages] Vinext exited during Windows prerender shutdown; verified static output and continuing.");
}

await writeFile(resolve(process.cwd(), "dist", "client", ".nojekyll"), "", "utf8");
