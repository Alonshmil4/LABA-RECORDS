const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const header = $("[data-header]");
const nav = $("[data-nav]");
const menuBtn = $("[data-menu-button]");
const bookingModal = $("[data-booking-modal]");
const yearEl = $("[data-year]");
const heroMedia = $(".hero-media");
const heroVideo = $(".hero-video");
const heroMeta = $("[data-hero-meta]");

function setScrolledHeader() {
  if (!header) return;
  const scrolled = window.scrollY > 6;
  header.classList.toggle("scrolled", scrolled);
  if (
    !scrolled &&
    nav &&
    header.classList.contains("logo-only") &&
    window.matchMedia("(max-width: 760px)").matches
  ) {
    setMenuOpen(false);
  }
}

function setHeroMetaPillsRevealed() {
  if (!heroMeta) return;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion || window.scrollY > 40) {
    heroMeta.classList.add("is-pills-revealed");
  }
}

/** Mobile only: rotate service-tag chunks every 1.5s; desktop keeps static row in HTML. */
function initHeroTagsMobileRotator() {
  const meta = document.querySelector("[data-hero-meta]");
  if (!meta) return;
  const source = meta.querySelector("[data-hero-tags-source]");
  const rotor = meta.querySelector("[data-hero-tags-mobile-rotor]");
  if (!source || !rotor) return;

  const mql = window.matchMedia("(max-width: 760px)");
  const ROTATE_MS = 1500;
  let timerId = null;
  let resizeTid = null;

  const serviceItems = $$("li:not([data-hero-tag-location])", source);
  const tags = serviceItems.map((li) => li.textContent.trim()).filter(Boolean);
  if (!tags.length) return;

  function buildPillRow(chunk) {
    const row = document.createElement("div");
    row.className = "hero-meta-row hero-meta-row--services hero-meta-row--mobile-rotor";
    chunk.forEach((text) => {
      const pill = document.createElement("span");
      pill.className = "pill";
      pill.textContent = text;
      row.appendChild(pill);
    });
    return row;
  }

  function chunkSize() {
    const w = window.innerWidth;
    if (w < 400) return 2;
    if (w < 520) return 3;
    return 3;
  }

  function toChunks(list) {
    const n = chunkSize();
    const out = [];
    for (let i = 0; i < list.length; i += n) {
      out.push(list.slice(i, i + n));
    }
    return out.length ? out : [list];
  }

  function setLayerState(layer, visible) {
    layer.classList.toggle("is-visible", visible);
    layer.classList.toggle("is-hidden", !visible);
  }

  function stop() {
    if (timerId != null) {
      window.clearInterval(timerId);
      timerId = null;
    }
    rotor.replaceChildren();
  }

  function start() {
    stop();
    if (!mql.matches) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const chunks = toChunks(tags);

    if (reduceMotion || chunks.length <= 1) {
      const layer = document.createElement("div");
      layer.className = "hero-tags-mobile-layer is-visible";
      layer.appendChild(buildPillRow(tags));
      rotor.appendChild(layer);
      return;
    }

    const layers = [document.createElement("div"), document.createElement("div")];
    layers.forEach((el) => {
      el.className = "hero-tags-mobile-layer";
      rotor.appendChild(el);
    });

    let index = 0;
    let active = 0;

    function renderInto(layer, chunk) {
      layer.replaceChildren();
      layer.appendChild(buildPillRow(chunk));
    }

    function reset() {
      const ch = toChunks(tags);
      if (!ch.length) return;
      index = 0;
      active = 0;
      renderInto(layers[0], ch[0]);
      layers[1].replaceChildren();
      void layers[0].offsetWidth;
      setLayerState(layers[0], true);
      setLayerState(layers[1], false);
    }

    function advance() {
      const ch = toChunks(tags);
      if (ch.length <= 1) return;
      const nextIndex = (index + 1) % ch.length;
      const incoming = layers[1 - active];
      const outgoing = layers[active];
      renderInto(incoming, ch[nextIndex]);
      void incoming.offsetWidth;
      setLayerState(incoming, true);
      setLayerState(outgoing, false);
      active = 1 - active;
      index = nextIndex;
    }

    reset();
    timerId = window.setInterval(advance, ROTATE_MS);
  }

  function onResize() {
    if (resizeTid != null) window.clearTimeout(resizeTid);
    resizeTid = window.setTimeout(() => {
      resizeTid = null;
      start();
    }, 200);
  }

  function onMqChange() {
    start();
  }

  mql.addEventListener("change", onMqChange);
  window.addEventListener("resize", onResize, { passive: true });
  start();
}

function setMenuOpen(isOpen) {
  if (!nav || !menuBtn) return;
  nav.classList.toggle("is-open", isOpen);
  menuBtn.setAttribute("aria-expanded", String(isOpen));
}

function wireMenu() {
  if (!nav || !menuBtn) return;
  menuBtn.addEventListener("click", () => {
    if (
      header?.classList.contains("logo-only") &&
      !header.classList.contains("scrolled") &&
      window.matchMedia("(max-width: 760px)").matches
    ) {
      return;
    }
    const isOpen = nav.classList.contains("is-open");
    setMenuOpen(!isOpen);
  });

  $$("#content a, [data-nav] a, [data-header] .header-cta-cluster a[href^='#']").forEach((a) => {
    a.addEventListener("click", () => setMenuOpen(false));
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setMenuOpen(false);
  });
}

function openBooking() {
  if (!bookingModal) return;
  if (typeof bookingModal.showModal === "function") {
    bookingModal.showModal();
    return;
  }
  alert("הדפדפן לא תומך בחלון הקופץ הזה. אפשר לפנות ישירות בוואטסאפ.");
}

function wireBooking() {
  $$("[data-open-booking]").forEach((btn) => {
    btn.addEventListener("click", openBooking);
  });

  if (!bookingModal) return;
  const form = $("form", bookingModal);
  if (!form) return;

  const parseWhatsappTarget = () => {
    const direct = $(".whatsapp-float")?.getAttribute("href") || "";
    const m = direct.match(/wa\.me\/(\d+)/);
    return m?.[1] || "972546345836";
  };

  form.addEventListener("submit", (e) => {
    const submitter = e.submitter;
    if (submitter?.value === "cancel") return;
    e.preventDefault();

    if (!form.reportValidity()) return;

    const fd = new FormData(form);
    const serviceSelect = form.elements.namedItem("service");
    const name = String(fd.get("name") || "").trim();
    const phone = String(fd.get("phone") || "").trim();
    const serviceFromFormData = String(fd.get("service") || "").trim();
    const serviceFromSelectValue =
      serviceSelect && "value" in serviceSelect ? String(serviceSelect.value || "").trim() : "";
    const serviceFromSelectedText =
      serviceSelect && "selectedOptions" in serviceSelect && serviceSelect.selectedOptions?.[0]
        ? String(serviceSelect.selectedOptions[0].textContent || "").trim()
        : "";
    const service = serviceFromFormData || serviceFromSelectValue || serviceFromSelectedText;
    const favoriteSong = String(fd.get("favoriteSong") || "").trim();
    const message = String(fd.get("message") || "").trim();

    if (!service || service.includes("בחר")) {
      if (serviceSelect && "focus" in serviceSelect) serviceSelect.focus();
      form.reportValidity();
      return;
    }

    const lines = [
      "הייי! הגעתי מהאתר של LABA RECORDS ואשמח לקבוע איתך סשן באולפן :)",
      "",
      "פרטים",
      `שם: ${name}`,
      `טלפון: ${phone}`,
      `מה מעניין אותי: ${service}`,
      `שיר אהוב כרגע: ${favoriteSong || "-"}`,
      `הודעה: ${message || "-"}`,
    ];

    const text = encodeURIComponent(lines.join("\n"));
    const waUrl = `https://wa.me/${parseWhatsappTarget()}?text=${text}`;
    const popup = window.open(waUrl, "_blank", "noopener,noreferrer");
    if (!popup) {
      window.location.href = waUrl;
    }

    bookingModal.close("confirm");
    form.reset();
  });
}

function wireFooterSongExperience() {
  const playerRoot = $("[data-footer-spotify-player]");
  const songModal = $("[data-footer-song-modal]");
  if (!playerRoot) return;

  const TRACK_URI = "spotify:track:5eRLUDkuZmM81JdB6xjGeV";
  const FALLBACK_DURATION_MS = 184000; // 3:04
  let fallbackTid = null;
  let modalOpened = false;

  const openSongModal = () => {
    if (!songModal || songModal.open || modalOpened) return;
    modalOpened = true;
    if (typeof songModal.showModal === "function") {
      songModal.showModal();
      return;
    }
    songModal.setAttribute("open", "");
  };

  const stripPlayerScrollbars = () => {
    const iframe = $("iframe", playerRoot);
    if (!iframe) return;
    iframe.setAttribute("scrolling", "no");
    iframe.style.overflow = "hidden";
    iframe.style.display = "block";
  };

  const armFallbackTimer = () => {
    if (fallbackTid != null) {
      window.clearTimeout(fallbackTid);
    }
    fallbackTid = window.setTimeout(openSongModal, FALLBACK_DURATION_MS);
  };

  if (songModal) {
    songModal.addEventListener("click", (e) => {
      if (e.target === songModal) songModal.close("cancel");
    });
    const bookingBtn = $("[data-footer-song-booking]", songModal);
    if (bookingBtn) {
      bookingBtn.addEventListener("click", () => {
        songModal.close("booking");
        openBooking();
      });
    }
  }

  const renderIframeFallback = () => {
    playerRoot.innerHTML = `
      <iframe
        src="https://open.spotify.com/embed/track/5eRLUDkuZmM81JdB6xjGeV?utm_source=generator&theme=0"
        title="לבה - Coral Bismuth"
        loading="lazy"
        scrolling="no"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      ></iframe>
    `;
    stripPlayerScrollbars();
    playerRoot.addEventListener("click", armFallbackTimer, { once: true });
  };

  window.onSpotifyIframeApiReady = (IFrameAPI) => {
    IFrameAPI.createController(
      playerRoot,
      { uri: TRACK_URI, width: 320, height: 80, theme: "dark" },
      (EmbedController) => {
        // API injects an iframe; remove inner scrollbars in compact mode.
        window.requestAnimationFrame(stripPlayerScrollbars);
        EmbedController.addListener("playback_update", (event) => {
          const data = event?.data || {};
          const duration = Number(data.duration) || FALLBACK_DURATION_MS;
          const position = Number(data.position) || 0;
          const isPaused = Boolean(data.isPaused);

          if (!isPaused && position > 0) {
            armFallbackTimer();
          }

          if (duration > 0 && position >= duration - 1200) {
            openSongModal();
          }
        });
      }
    );
  };

  const script = document.createElement("script");
  script.src = "https://open.spotify.com/embed/iframe-api/v1";
  script.async = true;
  script.onerror = renderIframeFallback;
  document.body.appendChild(script);
}

function wireAccordionSingleOpen() {
  const acc = $("[data-accordion]");
  if (!acc) return;
  const items = $$("details", acc);
  items.forEach((d) => {
    d.addEventListener("toggle", () => {
      if (!d.open) return;
      items.forEach((other) => {
        if (other !== d) other.open = false;
      });
    });
  });
}

function wireDisabledLinks() {
  $$("a[aria-disabled='true']").forEach((a) => {
    a.addEventListener("click", (e) => e.preventDefault());
  });
}

function wireGalleryCarousel() {
  const root = $("[data-gallery-carousel]");
  if (!root) return;
  const track = $("[data-carousel-track]", root);
  const prev = $("[data-carousel-prev]", root);
  const next = $("[data-carousel-next]", root);
  if (!track || !prev || !next) return;

  const getStep = () => {
    const firstSlide = $(".carousel-slide", track);
    if (!firstSlide) return 320;
    const rect = firstSlide.getBoundingClientRect();
    return rect.width + 10;
  };

  prev.addEventListener("click", () => {
    track.scrollBy({ left: -getStep(), behavior: "smooth" });
  });
  next.addEventListener("click", () => {
    track.scrollBy({ left: getStep(), behavior: "smooth" });
  });
}

function wireTestimonialsCarousel() {
  const root = $("[data-testimonials-carousel]");
  if (!root) return;
  const track = $("[data-testimonials-track]", root);
  const prev = $("[data-testimonials-prev]", root);
  const next = $("[data-testimonials-next]", root);
  if (!track || !prev || !next) return;

  const getStep = () => {
    const firstSlide = $(".testimonials-slide", track);
    if (!firstSlide) return 320;
    const rect = firstSlide.getBoundingClientRect();
    return rect.width + 14;
  };

  prev.addEventListener("click", () => {
    track.scrollBy({ left: -getStep(), behavior: "smooth" });
  });
  next.addEventListener("click", () => {
    track.scrollBy({ left: getStep(), behavior: "smooth" });
  });
}

function wireTracksCarousel() {
  const root = $("[data-tracks-carousel]");
  if (!root) return;
  const track = $("[data-tracks-track]", root);
  const prev = $("[data-tracks-prev]", root);
  const next = $("[data-tracks-next]", root);
  if (!track || !prev || !next) return;

  const getGap = () => {
    const raw = getComputedStyle(track).gap || "12px";
    const n = parseFloat(raw);
    return Number.isFinite(n) ? n : 12;
  };

  /* One “page” = full scrollport width + flex gap (matches CSS flex + scroll-snap) */
  const getStep = () => track.clientWidth + getGap();

  const scrollByStep = (dir) => {
    const step = getStep();
    const target = track.scrollLeft + dir * step;
    track.scrollTo({ left: target, behavior: "smooth" });
  };

  prev.addEventListener("click", () => scrollByStep(-1));
  next.addEventListener("click", () => scrollByStep(1));
}

function wireAdminBuilder() {
  try {
  const params = new URLSearchParams(window.location.search);
  const isAdminMode = params.get("admin") === "1" || localStorage.getItem("laba_admin_enabled") === "1";
  const ADMIN_CONTENT_VERSION = "v3";
  const storageKey = `laba_admin_content:${ADMIN_CONTENT_VERSION}:${window.location.pathname}`;
  const editableSelector = [
    "h1",
    "h2",
    "h3",
    "p",
    "summary",
    ".qa-body",
    ".kicker",
    ".track-title",
    ".track-meta",
    ".nav a",
    ".nav-link-cta",
    ".brand-name",
    ".brand-by",
    ".button",
    ".planter-quote",
    ".planter-by",
  ].join(", ");

  const loadStore = () => {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || "{}");
    } catch {
      return {};
    }
  };
  let store = loadStore();

  const editables = $$(editableSelector)
    .filter((el) => !el.closest(".admin-builder"))
    .filter((el) => !el.hasAttribute("data-admin-control"))
    .filter((el) => !el.querySelector("img, video, iframe"));

  // Always apply saved text overrides, even when admin mode is off.
  editables.forEach((el, idx) => {
    const key = `editable-${idx}`;
    el.dataset.adminEditable = key;
    if (store[key]) el.innerHTML = store[key];
  });

  if (!isAdminMode) return;

  localStorage.setItem("laba_admin_enabled", "1");

  const panel = document.createElement("aside");
  panel.className = "admin-builder";
  panel.setAttribute("dir", "rtl");
  panel.innerHTML = `
    <div class="admin-builder__title">מצב אדמין פעיל</div>
    <div class="admin-builder__hint">עריכה ישירה על הטקסט באתר (רק אצלך בדפדפן)</div>
    <div class="admin-builder__actions">
      <button type="button" class="button button-small" data-admin-control="export">ייצוא</button>
      <button type="button" class="button button-small" data-admin-control="import">ייבוא</button>
      <button type="button" class="button button-small button-ghost" data-admin-control="reset">איפוס</button>
      <button type="button" class="button button-small button-primary" data-admin-control="close">סגירה</button>
    </div>
  `;
  document.body.appendChild(panel);

  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/json";
  input.hidden = true;
  document.body.appendChild(input);

  const saveStore = () => localStorage.setItem(storageKey, JSON.stringify(store));
  const persistAll = () => {
    editables.forEach((el) => {
      const key = el.dataset.adminEditable;
      if (!key) return;
      store[key] = el.innerHTML;
    });
    saveStore();
  };

  editables.forEach((el, idx) => {
    const key = `editable-${idx}`;
    el.contentEditable = "true";
    el.setAttribute("spellcheck", "false");
    el.classList.add("admin-editable");
    el.addEventListener("input", () => {
      store[key] = el.innerHTML;
      saveStore();
    });
    el.addEventListener("blur", () => {
      store[key] = el.innerHTML;
      saveStore();
    });
  });

  window.addEventListener("beforeunload", persistAll);
  window.addEventListener("pagehide", persistAll);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") persistAll();
  });

  panel.addEventListener("click", (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    const action = target.getAttribute("data-admin-control");
    if (!action) return;

    if (action === "export") {
      persistAll();
      const blob = new Blob([JSON.stringify(store, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "laba-admin-content.json";
      a.click();
      URL.revokeObjectURL(url);
    }

    if (action === "import") {
      input.click();
    }

    if (action === "reset") {
      localStorage.removeItem(storageKey);
      window.location.reload();
    }

    if (action === "close") {
      persistAll();
      localStorage.removeItem("laba_admin_enabled");
      const url = new URL(window.location.href);
      url.searchParams.delete("admin");
      window.location.href = url.toString();
    }
  });

  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      store = JSON.parse(text);
      saveStore();
      window.location.reload();
    } catch {
      alert("קובץ לא תקין");
    } finally {
      input.value = "";
    }
  });
  } catch (err) {
    console.error("[LABA] wireAdminBuilder failed", err);
  }
}

function wireScrollReveal() {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const targets = $$(
    ".section-head, .testimonials-slide, .track, .step-card, .qa, .media-row img, .media-strip img, .tile, .about-text-only"
  );

  if (!targets.length) return;

  if (reduceMotion || !("IntersectionObserver" in window)) {
    targets.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  targets.forEach((el, idx) => {
    el.classList.add("reveal");
    el.style.setProperty("--reveal-delay", `${Math.min((idx % 6) * 55, 220)}ms`);
  });

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        obs.unobserve(entry.target);
      });
    },
    { threshold: 0.14, rootMargin: "0px 0px -8% 0px" }
  );

  targets.forEach((el) => observer.observe(el));
}

window.addEventListener("scroll", setScrolledHeader, { passive: true });
window.addEventListener("scroll", setHeroMetaPillsRevealed, { passive: true });
setScrolledHeader();
setHeroMetaPillsRevealed();
initHeroTagsMobileRotator();
wireMenu();
wireBooking();
wireFooterSongExperience();
wireAccordionSingleOpen();
wireDisabledLinks();
wireScrollReveal();
wireGalleryCarousel();
wireTestimonialsCarousel();
wireTracksCarousel();
wireAdminBuilder();

if (yearEl) yearEl.textContent = String(new Date().getFullYear());

if (heroMedia && heroVideo) {
  const markNoVideo = () => heroMedia.classList.add("no-video");
  heroVideo.addEventListener("error", markNoVideo);
  heroVideo.addEventListener("stalled", markNoVideo);
  heroVideo.addEventListener("abort", markNoVideo);
  heroVideo.addEventListener("loadeddata", () => heroMedia.classList.remove("no-video"));
  setTimeout(() => {
    if (heroVideo.readyState === 0) markNoVideo();
  }, 600);
}
