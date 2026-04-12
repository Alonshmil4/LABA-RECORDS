/**
 * בדיקת build ל-Vercel / CI: אתר סטטי — קבצי ליבה חייבים להיות בשורש.
 * אין transpile; אותו קוד שרץ מקומית.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const need = ["index.html", "main.js", "styles.css"];

for (const f of need) {
  const p = path.join(root, f);
  if (!fs.existsSync(p)) {
    console.error(`[build] חסר: ${f}`);
    process.exit(1);
  }
}

console.log("[build] קבצי אתר סטטי — OK");
