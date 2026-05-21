#!/usr/bin/env node
/**
 * Re-encode site background/gallery MP4s for web delivery + VP9 WebM siblings.
 * Overwrites ./assets/<name>.mp4 and writes ./assets/<name>.webm (faststart on MP4).
 *
 * Usage: node scripts/encode-site-videos.mjs [basename ...]
 *        node scripts/encode-site-videos.mjs   # all jobs below
 */
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import ffmpegStatic from "ffmpeg-static";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assetsDir = path.join(__dirname, "..", "assets");
const ffmpeg = ffmpegStatic;

/** @type {Record<string, { vf: string; fps?: number; crf: number; webmCrf: number; maxrate: string; bufsize: string }>} */
const PRESETS = {
  "hero-desktop": {
    vf: "scale='min(1920,iw)':-2",
    crf: 23,
    webmCrf: 38,
    maxrate: "2.8M",
    bufsize: "5.6M",
  },
  "hero-mobile": {
    vf: "scale='min(1080,iw)':-2",
    crf: 24,
    webmCrf: 39,
    maxrate: "1.6M",
    bufsize: "3.2M",
  },
  "section-desktop": {
    vf: "scale='min(1280,iw)':-2",
    crf: 24,
    webmCrf: 39,
    maxrate: "2.2M",
    bufsize: "4.4M",
  },
  "section-mobile": {
    vf: "scale='min(720,iw)':-2",
    crf: 25,
    webmCrf: 40,
    maxrate: "1.3M",
    bufsize: "2.6M",
  },
  "gallery-desktop": {
    vf: "scale='min(1080,iw)':-2",
    fps: 30,
    crf: 23,
    webmCrf: 40,
    maxrate: "2.4M",
    bufsize: "4.8M",
  },
  "gallery-mobile": {
    vf: "scale='min(720,iw)':-2",
    fps: 30,
    crf: 24,
    webmCrf: 41,
    maxrate: "1.1M",
    bufsize: "2.2M",
  },
};

/** @type {{ base: string; preset: string; from?: string }[]} */
const JOBS = [
  { base: "hero", preset: "hero-desktop" },
  { base: "hero-mobile", preset: "hero-mobile" },
  { base: "productions-bg", preset: "section-desktop" },
  { base: "productions-bg-mobile", preset: "section-mobile" },
  { base: "yam-about-mobile", preset: "section-mobile" },
  { base: "about-desktop-video-project-20-v2", preset: "section-desktop" },
  { base: "testimonials-bg", preset: "section-desktop" },
  { base: "matana-bg-2", preset: "section-desktop" },
  { base: "faq-bg", preset: "section-desktop" },
  { base: "gallery-linkedin", preset: "gallery-desktop" },
  {
    base: "gallery-linkedin-mobile",
    preset: "gallery-mobile",
    from: "gallery-linkedin",
  },
];

function run(args, label) {
  const r = spawnSync(ffmpeg, args, { stdio: "inherit" });
  if (r.status !== 0) {
    console.error(`ffmpeg failed: ${label}`);
    process.exit(r.status ?? 1);
  }
}

function vfChain(preset) {
  const parts = [preset.vf];
  if (preset.fps) parts.push(`fps=${preset.fps}`);
  return parts.join(",");
}

function mb(file) {
  return (fs.statSync(file).size / (1024 * 1024)).toFixed(2);
}

function encodePair(job) {
  const preset = PRESETS[job.preset];
  if (!preset) throw new Error(`unknown preset: ${job.preset}`);

  const sourceBase = job.from ?? job.base;
  const input = path.join(assetsDir, `${sourceBase}.mp4`);
  if (!fs.existsSync(input)) {
    console.error("missing:", input);
    process.exit(1);
  }

  const mp4Out = path.join(assetsDir, `${job.base}.mp4`);
  const webmOut = path.join(assetsDir, `${job.base}.webm`);
  const mp4Tmp = path.join(assetsDir, `${job.base}.tmp.mp4`);
  const webmTmp = path.join(assetsDir, `${job.base}.tmp.webm`);
  const vf = vfChain(preset);

  console.log(`\n=== ${job.base} (${job.preset}) ← ${sourceBase}.mp4 ===`);
  console.log(`    before: ${mb(input)} MB`);

  run(
    [
      "-y",
      "-i",
      input,
      "-an",
      "-vf",
      vf,
      "-c:v",
      "libx264",
      "-profile:v",
      "high",
      "-preset",
      "slow",
      "-crf",
      String(preset.crf),
      "-maxrate",
      preset.maxrate,
      "-bufsize",
      preset.bufsize,
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      mp4Tmp,
    ],
    `${job.base} mp4`
  );

  run(
    [
      "-y",
      "-i",
      input,
      "-an",
      "-vf",
      vf,
      "-c:v",
      "libvpx-vp9",
      "-crf",
      String(preset.webmCrf),
      "-b:v",
      "0",
      "-deadline",
      "good",
      "-row-mt",
      "1",
      "-cpu-used",
      "4",
      webmTmp,
    ],
    `${job.base} webm`
  );

  fs.renameSync(mp4Tmp, mp4Out);
  fs.renameSync(webmTmp, webmOut);

  const mp4Size = fs.statSync(mp4Out).size;
  const webmSize = fs.statSync(webmOut).size;
  if (webmSize >= mp4Size * 0.92) {
    const webmMb = mb(webmOut);
    fs.unlinkSync(webmOut);
    console.log(`    after:  ${mb(mp4Out)} MB mp4 (webm omitted — ${webmMb} MB was not smaller)`);
  } else {
    console.log(`    after:  ${mb(mp4Out)} MB mp4, ${mb(webmOut)} MB webm`);
  }
}

const selected = new Set(process.argv.slice(2));
const queue = selected.size ? JOBS.filter((j) => selected.has(j.base)) : JOBS;

if (!queue.length) {
  console.error("no matching jobs; basenames:", JOBS.map((j) => j.base).join(", "));
  process.exit(1);
}

for (const job of queue) encodePair(job);
console.log("\n✓ encode complete");
