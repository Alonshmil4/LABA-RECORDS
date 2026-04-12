/**
 * מחלץ תוכן מ־index.html לכל data-admin-key → site-content.json
 * הרצה: npm run admin:extract
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { load } from "cheerio";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const indexPath = path.join(root, "index.html");
const outPath = path.join(root, "site-content.json");

const html = fs.readFileSync(indexPath, "utf8");
const $ = load(html, { decodeEntities: false });

const text = {};
$("[data-admin-key]").each((_, el) => {
  const $el = $(el);
  const key = $el.attr("data-admin-key");
  if (!key) return;
  const sec = $el.closest("section[id]");
  const sid = sec.attr("id") || "_";
  const compound = `${sid}:${key}`;
  text[compound] = $el.html() ?? "";
});

const payload = {
  version: 7,
  text,
  elementStyles: {},
  globalCss: "",
};

fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(`[admin:extract] נכתב ${outPath} (${Object.keys(text).length} שדות)`);
