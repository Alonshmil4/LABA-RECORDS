import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const inPath = path.join(ROOT, "assets", "logo.png");
const outPath = path.join(ROOT, "assets", "logo-clean.png");

const THRESH = 10; // treat near-black as background

async function main() {
  const img = sharp(inPath);
  const meta = await img.metadata();
  if (!meta.width || !meta.height) throw new Error("Could not read image metadata.");

  const { data, info } = await img
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;
  const channels = info.channels; // should be 4

  let minX = w,
    minY = h,
    maxX = -1,
    maxY = -1;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * channels;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      if (a < 5) continue;
      if (r > THRESH || g > THRESH || b > THRESH) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < minX || maxY < minY) {
    throw new Error("Could not detect non-black content area.");
  }

  // add a tiny padding
  const pad = 6;
  const left = Math.max(0, minX - pad);
  const top = Math.max(0, minY - pad);
  const width = Math.min(w - left, maxX - minX + 1 + pad * 2);
  const height = Math.min(h - top, maxY - minY + 1 + pad * 2);

  await sharp(inPath).extract({ left, top, width, height }).png().toFile(outPath);
  const stat = await fs.stat(outPath);
  console.log(`Wrote ${outPath} (${stat.size} bytes)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

