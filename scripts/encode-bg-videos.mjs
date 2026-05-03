#!/usr/bin/env node
/**
 * Prints ffmpeg commands to re-encode background MP4s for web + mobile.
 * Run locally after installing ffmpeg (https://ffmpeg.org/). Does not modify files.
 *
 * Targets: H.264 + AAC, yuv420p, faststart (moov at head), capped bitrate for smooth cellular.
 * Replace INPUT/OUTPUT paths; keep originals as backup before overwriting.
 */

const presets = [
  {
    name: "hero-mobile-ish (portrait / narrow)",
    vf: "scale='min(720,iw)':-2",
    maxrate: "1.4M",
    bufsize: "2.8M",
  },
  {
    name: "section-bg / desktop-ish landscape",
    vf: "scale='min(1280,iw)':-2",
    maxrate: "2.2M",
    bufsize: "4.4M",
  },
];

const common =
  "-movflags +faststart -pix_fmt yuv420p -c:v libx264 -profile:v high -preset slow -crf 26 -c:a aac -b:a 96k -ac 2";

console.log("# LABA RECORDS — suggested ffmpeg one-liners (copy-paste; adjust paths)\n");
console.log("# Install: https://ffmpeg.org/download.html\n");

const files = [
  "hero-mobile.mp4",
  "hero.mp4",
  "productions-bg-mobile.mp4",
  "productions-bg.mp4",
  "yam-about-mobile.mp4",
  "about-desktop-video-project-20-v2.mp4",
  "testimonials-bg.mp4",
  "matana-bg-2.mp4",
  "faq-bg.mp4",
];

for (const f of files) {
  const isMobileNamed = /mobile|yam-about/i.test(f);
  const p = isMobileNamed ? presets[0] : presets[1];
  const out = f.replace(/\.mp4$/i, ".web-h264.mp4");
  console.log(`# ${f} → ${out} (${p.name})`);
  console.log(
    [
      "ffmpeg -y -i",
      `"./assets/${f}"`,
      `-vf "${p.vf}"`,
      common,
      `-maxrate ${p.maxrate} -bufsize ${p.bufsize}`,
      `"./assets/${out}"`,
    ].join(" ")
  );
  console.log("");
}

console.log(
  "# After QA on devices, replace originals or update index.html source paths to *.web-h264.mp4\n"
);
