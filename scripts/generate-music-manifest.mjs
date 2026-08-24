import { mkdir, readdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const musicDirectory = resolve(process.cwd(), "public", "music");
const manifestPath = resolve(musicDirectory, "playlist.json");
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");

await mkdir(musicDirectory, { recursive: true });

const supportedAudio = /\.(mp3|wav|ogg|m4a)$/i;

const files = (await readdir(musicDirectory, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && supportedAudio.test(entry.name))
  .map((entry) => entry.name)
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

const tracks = files.map((filename) => ({
  title: filename.replace(supportedAudio, "").replace(/[-_]+/g, " "),
  src: `${basePath}/music/${encodeURIComponent(filename)}`,
}));

await writeFile(manifestPath, `${JSON.stringify(tracks, null, 2)}\n`, "utf8");

console.log(`[music] ${tracks.length} audio file(s) found in public/music`);
