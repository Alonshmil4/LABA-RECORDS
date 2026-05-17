#!/usr/bin/env node
/**
 * Remux MP4 with faststart (moov at head) + optional poster frame. No re-encode = no quality loss.
 * Usage: node scripts/optimize-bg-video.mjs [basename without extension]
 */
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import ffmpegStatic from "ffmpeg-static";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assetsDir = path.join(__dirname, "..", "assets");
const ffmpeg = ffmpegStatic;

const basenames = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ["testimonials-bg"];

function run(args) {
  const r = spawnSync(ffmpeg, args, { stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

for (const base of basenames) {
  const input = path.join(assetsDir, `${base}.mp4`);
  if (!fs.existsSync(input)) {
    console.error("missing:", input);
    process.exit(1);
  }
  const tmp = path.join(assetsDir, `${base}.faststart.tmp.mp4`);
  const poster = path.join(assetsDir, `${base}-poster.jpg`);

  console.log("\n→ faststart", base);
  run(["-y", "-i", input, "-c", "copy", "-movflags", "+faststart", tmp]);
  fs.renameSync(tmp, input);

  console.log("→ poster", base);
  run([
    "-y",
    "-ss",
    "0.5",
    "-i",
    input,
    "-frames:v",
    "1",
    "-q:v",
    "2",
    "-vf",
    "scale='min(1920,iw)':-2",
    "-update",
    "1",
    poster,
  ]);

  const mb = (fs.statSync(input).size / (1024 * 1024)).toFixed(2);
  console.log(`✓ ${base}.mp4 (${mb} MB), ${base}-poster.jpg`);
}
