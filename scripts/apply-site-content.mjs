/**
 * מיישם site-content.json על index.html + בלוק CSS ב-styles.css
 * (ללא פרסור מלא של המסמך — נשמרים doctype וריווחים)
 * הרצה: npm run admin:apply
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const jsonPath = path.join(root, "site-content.json");
const indexPath = path.join(root, "index.html");
const stylesPath = path.join(root, "styles.css");

const MARK_START = "/* __LABA_ADMIN_GLOBAL_CSS_START__ */";
const MARK_END = "/* __LABA_ADMIN_GLOBAL_CSS_END__ */";

const VOID = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

function stripDangerousHtml(html) {
  if (typeof html !== "string") return "";
  let s = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
  s = s.replace(/\son\w+\s*=/gi, " data-blocked=");
  return s;
}

function sanitizeCssValue(raw) {
  if (typeof raw !== "string") return "";
  const t = raw.trim();
  if (!t || t.length > 96) return "";
  if (/[;{}]|@import|url\s*\(|expression\s*\(|!important|<|>/i.test(t)) return "";
  if (!/^[\d\s.%#+(),\-/a-zA-Z"'_:]+$/i.test(t)) return "";
  return t;
}

function sanitizeInlineStyleBlock(raw) {
  if (typeof raw !== "string") return "";
  const parts = raw.split(";").map((p) => p.trim()).filter(Boolean);
  const out = [];
  for (const p of parts) {
    const i = p.indexOf(":");
    if (i <= 0) continue;
    const prop = p.slice(0, i).trim();
    const val = p.slice(i + 1).trim();
    if (!/^[-\w]+$/.test(prop)) continue;
    const v = sanitizeCssValue(val);
    if (v) out.push(`${prop}: ${v}`);
  }
  return out.join("; ");
}

function sanitizeGlobalCss(css) {
  if (typeof css !== "string") return "";
  if (css.length > 12000) return "";
  if (/@import|url\s*\(|expression\s*\(|<\/style|javascript:/i.test(css)) return "";
  return css.trim();
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** מחליף תוכן פנימי של אלמנט יחיד לפי data-admin-key (ייחודי בדף) */
function replaceInnerByDataAdminKey(html, adminKey, newInner) {
  const attr = `data-admin-key="${adminKey}"`;
  const pos = html.indexOf(attr);
  if (pos === -1) {
    console.warn("[admin:apply] לא נמצא data-admin-key:", adminKey);
    return { html, ok: false };
  }
  const openBracket = html.lastIndexOf("<", pos);
  if (openBracket === -1) return { html, ok: false };
  const tagMatch = html.slice(openBracket + 1, openBracket + 24).match(/^(\w+)/);
  if (!tagMatch) return { html, ok: false };
  const tag = tagMatch[1].toLowerCase();
  const openTagEnd = html.indexOf(">", pos);
  if (openTagEnd === -1) return { html, ok: false };
  const openFull = html.slice(openBracket, openTagEnd + 1);
  if (/\/\s*>$/.test(openFull) || VOID.has(tag)) {
    console.warn("[admin:apply] אלמנט ריק/void — דילוג:", adminKey);
    return { html, ok: false };
  }

  let depth = 1;
  let i = openTagEnd + 1;
  const closeNeedle = `</${tag}`;
  while (i < html.length && depth > 0) {
    const lt = html.indexOf("<", i);
    if (lt === -1) break;
    if (html[lt + 1] === "/") {
      const closeM = html.slice(lt + 2, lt + 2 + tag.length + 4).toLowerCase();
      if (closeM.startsWith(tag) && /^\w/.test(closeM)) {
        const gt = html.indexOf(">", lt);
        if (gt === -1) break;
        const chunk = html.slice(lt, gt + 1);
        if (new RegExp(`^</${tag}\\s*>`, "i").test(chunk)) {
          depth--;
          if (depth === 0) {
            const innerStart = openTagEnd + 1;
            const innerEnd = lt;
            const next = html.slice(0, innerStart) + newInner + html.slice(innerEnd);
            return { html: next, ok: true };
          }
          i = gt + 1;
          continue;
        }
      }
      i = lt + 1;
      continue;
    }
    const nextTag = html.slice(lt + 1).match(/^(\w+)/);
    if (nextTag) {
      const innerTag = nextTag[1].toLowerCase();
      if (innerTag === tag) {
        const gt = html.indexOf(">", lt);
        if (gt === -1) break;
        const frag = html.slice(lt, gt + 1);
        if (!/\/\s*>$/.test(frag) && !VOID.has(innerTag)) depth++;
      }
    }
    i = lt + 1;
  }
  console.warn("[admin:apply] לא נסגר תג עבור:", adminKey, tag);
  return { html, ok: false };
}

function replaceStyleAttrByDataAdminKey(html, adminKey, styleVal) {
  const attr = `data-admin-key="${adminKey}"`;
  const pos = html.indexOf(attr);
  if (pos === -1) return { html, ok: false };
  const openBracket = html.lastIndexOf("<", pos);
  const openTagEnd = html.indexOf(">", pos);
  if (openBracket === -1 || openTagEnd === -1) return { html, ok: false };
  const openTag = html.slice(openBracket, openTagEnd + 1);
  const cleaned = sanitizeInlineStyleBlock(styleVal);
  let nextOpen = openTag;
  if (cleaned) {
    if (/\sstyle\s*=\s*"/i.test(nextOpen)) {
      nextOpen = nextOpen.replace(/\sstyle\s*=\s*"[^"]*"/i, ` style="${cleaned.replace(/"/g, "&quot;")}"`);
    } else {
      nextOpen = nextOpen.replace(/>$/, ` style="${cleaned.replace(/"/g, "&quot;")}">`);
    }
  } else {
    nextOpen = nextOpen.replace(/\sstyle\s*=\s*"[^"]*"/i, "");
  }
  const out = html.slice(0, openBracket) + nextOpen + html.slice(openTagEnd + 1);
  return { html: out, ok: true };
}

if (!fs.existsSync(jsonPath)) {
  console.error("[admin:apply] חסר site-content.json — npm run admin:extract");
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
let html = fs.readFileSync(indexPath, "utf8");

let missing = 0;
for (const [compound, inner] of Object.entries(data.text || {})) {
  if (typeof inner !== "string") continue;
  const idx = compound.indexOf(":");
  if (idx === -1) continue;
  const adminKey = compound.slice(idx + 1);
  if (!/^[\w-]+$/.test(adminKey)) continue;
  const safe = stripDangerousHtml(inner);
  const { html: h, ok } = replaceInnerByDataAdminKey(html, adminKey, safe);
  html = h;
  if (!ok) missing += 1;
}

for (const [compound, style] of Object.entries(data.elementStyles || {})) {
  if (typeof style !== "string" || !style.trim()) continue;
  const idx = compound.indexOf(":");
  if (idx === -1) continue;
  const adminKey = compound.slice(idx + 1);
  if (!/^[\w-]+$/.test(adminKey)) continue;
  const { html: h } = replaceStyleAttrByDataAdminKey(html, adminKey, style);
  html = h;
}

fs.writeFileSync(indexPath, html, "utf8");
console.log("[admin:apply] עודכן index.html");

let css = fs.readFileSync(stylesPath, "utf8");
const block = `${MARK_START}\n${sanitizeGlobalCss(data.globalCss || "")}\n${MARK_END}`;
if (css.includes(MARK_START) && css.includes(MARK_END)) {
  css = css.replace(new RegExp(`${escapeRe(MARK_START)}[\\s\\S]*?${escapeRe(MARK_END)}`, "m"), block);
} else {
  css = `${css.trimEnd()}\n\n${block}\n`;
}
fs.writeFileSync(stylesPath, css, "utf8");
console.log("[admin:apply] עודכן styles.css");

if (missing) console.warn(`[admin:apply] סיום עם ${missing} שגיאות החלפה`);
