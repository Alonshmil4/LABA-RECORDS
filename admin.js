/**
 * ממשק אדמין — עריכת site-content.json + localStorage
 * לפני פריסה: שנה את ADMIN_PIN למשהו פרטי.
 */
const ADMIN_PIN = "laba2026";
const ADMIN_CONTENT_VERSION = "v7";
const SESSION_KEY = "laba_admin_session";
const STORAGE_TEXT = `laba_admin_content:${ADMIN_CONTENT_VERSION}:site`;
const STORAGE_STYLES = `laba_admin_element_styles:${ADMIN_CONTENT_VERSION}`;
const STORAGE_GLOBAL_CSS = `laba_admin_global_css:${ADMIN_CONTENT_VERSION}`;

const FIELD_LABELS = {
  "home:hero-title-primary": "הירו — שורת כותרת ראשית",
  "home:hero-title-secondary": "הירו — שורת כותרת משנה",
  "home:hero-location": "הירו — לוקיישן",
  "home:hero-lead": "הירו — פסקת «אני מכירה…»",
  "home:hero-kicker": "הירו — שורת LABA RECORDS",
  "productions:tracks-headline": "הפקות — כותרת",
  "productions:tracks-intro-body": "הפקות — טקסט מבוא",
  "productions:booking-cta": "הפקות — כפתור CTA",
  "about:mobile-teaser-lead": "אודות מובייל — טיזר",
  "about:mobile-more-body": "אודות מובייל — המשך (עוד)",
  "about:desktop-heading": "אודות דסקטופ — כותרת",
  "about:desktop-prose": "אודות דסקטופ — טקסט",
  "process:process-step-1-title": "תהליך 1 — כותרת",
  "process:process-step-1-body": "תהליך 1 — גוף",
  "process:process-step-2-title": "תהליך 2 — כותרת",
  "process:process-step-2-body": "תהליך 2 — גוף",
  "process:process-step-3-title": "תהליך 3 — כותרת",
  "process:process-step-3-body": "תהליך 3 — גוף",
  "process:process-step-4-title": "תהליך 4 — כותרת",
  "process:process-step-4-body": "תהליך 4 — גוף",
  "process:process-step-5-title": "תהליך 5 — כותרת",
  "process:process-step-5-body": "תהליך 5 — גוף",
  "faq:faq-q-produce-time": "שאלה — זמן הפקה",
  "faq:faq-a-produce-time": "תשובה — זמן הפקה",
  "faq:faq-q-first-session-bring": "שאלה — מה להביא",
  "faq:faq-a-first-session-bring": "תשובה — מה להביא",
  "faq:faq-q-trial-session": "שאלה — סשן ניסיון",
  "faq:faq-a-trial-session": "תשובה — סשן ניסיון",
  "faq:faq-q-parking-location": "שאלה — חניה",
  "faq:faq-a-parking-location": "תשובה — חניה",
  "faq:faq-q-who-studio-for": "שאלה — למי מתאים",
  "faq:faq-a-who-studio-for": "תשובה — למי מתאים",
  "faq:faq-q-session-flow": "שאלה — איך נראה סשן",
  "faq:faq-a-session-flow": "תשובה — איך נראה סשן",
  "gallery:gallery-intro": "גלריה — מבוא",
};

function $(sel, root = document) {
  return root.querySelector(sel);
}

function loadJsonStore() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_TEXT) || "{}");
  } catch {
    return {};
  }
}

function saveJsonStore(obj) {
  localStorage.setItem(STORAGE_TEXT, JSON.stringify(obj));
}

function downloadJson(filename, obj) {
  const blob = new Blob([JSON.stringify(obj, null, 2) + "\n"], { type: "application/json;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function ensureSession() {
  if (sessionStorage.getItem(SESSION_KEY) === "1") return true;
  const pin = window.prompt("סיסמת אדמין:");
  if (pin !== ADMIN_PIN) {
    alert("סיסמה שגויה.");
    return false;
  }
  sessionStorage.setItem(SESSION_KEY, "1");
  return true;
}

async function loadBaseContent() {
  const res = await fetch("./site-content.json", { cache: "no-store" });
  if (!res.ok) throw new Error("לא נטען site-content.json");
  return res.json();
}

function buildForm(base, mergedText) {
  const host = $("#admin-fields");
  host.replaceChildren();
  const keys = Object.keys(base.text || {}).sort((a, b) => a.localeCompare(b, "he"));
  keys.forEach((key) => {
    const wrap = document.createElement("div");
    wrap.className = "admin-field";
    const lab = document.createElement("label");
    lab.htmlFor = `f-${key.replace(/:/g, "-")}`;
    lab.textContent = FIELD_LABELS[key] || key;
    const ta = document.createElement("textarea");
    ta.id = `f-${key.replace(/:/g, "-")}`;
    ta.dataset.compoundKey = key;
    ta.rows = Math.min(18, Math.max(4, String(mergedText[key] || "").split("\n").length + 2));
    ta.value = decodeHtmlEntitiesForEditor(mergedText[key] ?? base.text[key] ?? "");
    const row = document.createElement("div");
    row.className = "admin-field-actions";
    const b1 = document.createElement("button");
    b1.type = "button";
    b1.className = "admin-btn admin-btn--ghost";
    b1.textContent = "שורות חדשות → <br />";
    b1.addEventListener("click", () => {
      ta.value = ta.value.replace(/\r\n/g, "\n").split("\n").join("<br />\n");
    });
    row.appendChild(b1);
    wrap.appendChild(lab);
    wrap.appendChild(ta);
    wrap.appendChild(row);
    host.appendChild(wrap);
  });
}

/** להצגה בעורך: ממיר &lt;br&gt; לשורות אם אין תגיות */
function decodeHtmlEntitiesForEditor(s) {
  if (!s) return "";
  if (!/<[a-z]/i.test(s)) {
    return s.replace(/<br\s*\/?>/gi, "\n");
  }
  return s;
}

function collectTextFromForm() {
  const out = {};
  $$("#admin-fields textarea[data-compound-key]").forEach((ta) => {
    const k = ta.dataset.compoundKey;
    out[k] = ta.value;
  });
  return out;
}

function $$(sel, root = document) {
  return Array.from(root.querySelectorAll(sel));
}

async function init() {
  if (!ensureSession()) {
    const g = $("#admin-gate");
    if (g) g.innerHTML = "<p>אין גישה.</p>";
    return;
  }
  $("#admin-gate")?.remove();
  $("#admin-app").hidden = false;

  let base;
  try {
    base = await loadBaseContent();
  } catch (e) {
    $("#admin-status").textContent = String(e.message || e);
    return;
  }

  const mergedText = { ...base.text, ...loadJsonStore() };
  buildForm(base, mergedText);

  let stylesObj = {};
  try {
    stylesObj = JSON.parse(localStorage.getItem(STORAGE_STYLES) || "{}");
  } catch {
    stylesObj = {};
  }
  if (base.elementStyles) stylesObj = { ...base.elementStyles, ...stylesObj };
  $("#admin-element-styles").value = JSON.stringify(stylesObj, null, 2);

  let gcss = localStorage.getItem(STORAGE_GLOBAL_CSS) || "";
  if (!gcss.trim() && base.globalCss) gcss = base.globalCss;
  $("#admin-global-css").value = gcss;

  $("#admin-save-preview").addEventListener("click", () => {
    const prev = loadJsonStore();
    const next = { ...prev, ...collectTextFromForm() };
    saveJsonStore(next);
    try {
      const st = JSON.parse($("#admin-element-styles").value || "{}");
      localStorage.setItem(STORAGE_STYLES, JSON.stringify(st));
    } catch {
      alert("JSON ריווחים לא תקין — לא נשמר.");
      return;
    }
    localStorage.setItem(STORAGE_GLOBAL_CSS, $("#admin-global-css").value || "");
    $("#admin-status").textContent = "נשמר ב-localStorage. רעננו את דף הבית.";
  });

  $("#admin-download").addEventListener("click", () => {
    const text = { ...base.text, ...collectTextFromForm() };
    let elementStyles = {};
    try {
      elementStyles = JSON.parse($("#admin-element-styles").value || "{}");
    } catch {
      alert("JSON ריווחים לא תקין.");
      return;
    }
    const globalCss = $("#admin-global-css").value || "";
    downloadJson("site-content.json", {
      version: base.version || 7,
      text,
      elementStyles,
      globalCss,
    });
    $("#admin-status").textContent = "הורד site-content.json — החליפו בפרויקט והריצו npm run admin:apply";
  });
}

document.addEventListener("DOMContentLoaded", () => {
  init().catch((e) => {
    $("#admin-status").textContent = String(e);
  });
});
