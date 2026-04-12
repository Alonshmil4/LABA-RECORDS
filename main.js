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

function wireStudioStoriesCarousel() {
  const root = document.querySelector("[data-story-carousel]");
  if (!root) return;
  const track = root.querySelector("[data-story-track]");
  const prev = root.querySelector("[data-story-prev]");
  const next = root.querySelector("[data-story-next]");
  const dotsWrap = root.querySelector("[data-story-dots]");
  if (!track || !prev || !next || !dotsWrap) return;

  const slides = Array.from(track.querySelectorAll(".story-slide"));
  if (!slides.length) return;

  const dots = slides.map((_, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "story-dot";
    b.setAttribute("aria-label", `סטורי ${i + 1}`);
    b.addEventListener("click", () => {
      const left = track.clientWidth * i;
      track.scrollTo({ left, behavior: "smooth" });
    });
    dotsWrap.appendChild(b);
    return b;
  });

  const nearestIndex = () => {
    const w = track.clientWidth || 1;
    return Math.min(slides.length - 1, Math.max(0, Math.round(track.scrollLeft / w)));
  };

  const sync = () => {
    const i = nearestIndex();
    dots.forEach((d, idx) => d.classList.toggle("is-active", idx === i));
    prev.disabled = i <= 0;
    next.disabled = i >= slides.length - 1;
  };

  prev.addEventListener("click", () => {
    const i = nearestIndex();
    const left = track.clientWidth * Math.max(0, i - 1);
    track.scrollTo({ left, behavior: "smooth" });
  });
  next.addEventListener("click", () => {
    const i = nearestIndex();
    const left = track.clientWidth * Math.min(slides.length - 1, i + 1);
    track.scrollTo({ left, behavior: "smooth" });
  });

  const goToIndex = (idx) => {
    const nextIndex = Math.min(slides.length - 1, Math.max(0, idx));
    const left = track.clientWidth * nextIndex;
    track.scrollTo({ left, behavior: "smooth" });
  };
  const wrapIndex = (idx) => {
    const total = slides.length;
    if (!total) return 0;
    return ((idx % total) + total) % total;
  };

  // Mobile-style tap navigation: left tap = previous, right tap = next.
  let tapStartX = 0;
  let tapStartY = 0;
  track.addEventListener(
    "pointerdown",
    (e) => {
      tapStartX = e.clientX;
      tapStartY = e.clientY;
    },
    { passive: true }
  );
  track.addEventListener("pointerup", (e) => {
    const dx = Math.abs(e.clientX - tapStartX);
    const dy = Math.abs(e.clientY - tapStartY);
    // Treat as tap only if finger didn't drag significantly.
    if (dx > 12 || dy > 12) return;
    const rect = track.getBoundingClientRect();
    const isRightHalf = e.clientX - rect.left > rect.width / 2;
    const i = nearestIndex();
    goToIndex(wrapIndex(isRightHalf ? i + 1 : i - 1));
  });

  // Fallback tap handlers per slide (helps on some mobile browsers)
  slides.forEach((slide) => {
    slide.addEventListener("click", (e) => {
      const target = e.target;
      if (target instanceof HTMLElement && target.closest("a, button")) return;
      const rect = slide.getBoundingClientRect();
      const isRightHalf = e.clientX - rect.left > rect.width / 2;
      const i = nearestIndex();
      goToIndex(wrapIndex(isRightHalf ? i + 1 : i - 1));
    });
  });

  track.addEventListener("scroll", sync, { passive: true });
  window.addEventListener("resize", sync);
  sync();
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

  const sync = () => {
    const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth);
    const atStart = track.scrollLeft <= 2;
    const atEnd = track.scrollLeft >= maxScroll - 2;
    prev.classList.toggle("is-hidden", atStart);
    prev.disabled = atStart;
    next.disabled = atEnd;
  };

  track.addEventListener("scroll", sync, { passive: true });
  window.addEventListener("resize", sync);
  sync();
}

function wireAboutMobileStoryExperience() {
  const about = document.querySelector("#about");
  if (!about) return;

  const params = new URLSearchParams(window.location.search);
  const requested = (params.get("aboutMobile") || "").toLowerCase();
  const variant = requested === "cards" ? "cards" : "sticky";

  about.classList.add("about-mobile-story");
  about.classList.remove("about-mobile-story--sticky", "about-mobile-story--cards");
  about.classList.add(`about-mobile-story--${variant}`);

  const isMobile = window.matchMedia("(max-width: 760px)").matches;
  if (!isMobile) return;

  const morePanel = about.querySelector("[data-about-mobile-more]");
  const teaser = about.querySelector(".about-mobile-card--teaser");
  const cards = Array.from(about.querySelectorAll(".about-mobile-card"));
  if (!cards.length) return;

  cards.forEach((card, idx) => {
    card.classList.add("mobile-reveal");
    card.style.setProperty("--about-mobile-delay", `${Math.min(idx * 65, 260)}ms`);
  });

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion || !("IntersectionObserver" in window)) {
    cards.forEach((card) => card.classList.add("is-visible"));
    return;
  }

  if (teaser) teaser.classList.add("is-visible");

  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        obs.unobserve(entry.target);
      });
    },
    {
      threshold: 0.2,
      rootMargin: "0px 0px -8% 0px",
    }
  );

  cards.forEach((card) => {
    if (teaser && card === teaser) return;
    if (morePanel?.contains(card)) return;
    obs.observe(card);
  });
}

function wireAboutMobileMoreToggle() {
  const btn = document.querySelector("[data-about-more-toggle]");
  const panel = document.querySelector("#about [data-about-mobile-more]");
  if (!btn || !panel) return;

  btn.addEventListener("click", () => {
    if (btn.hidden) return;

    panel.removeAttribute("hidden");
    btn.setAttribute("aria-expanded", "true");

    panel.querySelectorAll(".about-mobile-card").forEach((card) => card.classList.add("is-visible"));

    const teaser = btn.closest(".about-mobile-card--teaser");
    if (teaser) teaser.classList.add("about-mobile-card--more-revealed");

    btn.hidden = true;
    btn.setAttribute("aria-hidden", "true");
  });
}

function wireAboutMobileBook() {
  const about = document.querySelector("#about");
  if (about?.classList.contains("about-mobile-story")) return;

  const track = document.querySelector("[data-about-mobile-carousel]");
  const prev = document.querySelector("[data-about-book-prev]");
  const next = document.querySelector("[data-about-book-next]");
  const counter = document.querySelector("[data-about-book-counter]");
  if (!track || !prev || !next) return;

  const cards = () => Array.from(track.querySelectorAll(".about-mobile-card"));

  function pageWidth() {
    return track.clientWidth;
  }

  function scrollBehavior() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
  }

  function nearestIndex() {
    const list = cards();
    if (!list.length) return 0;
    const sl = track.scrollLeft;
    let best = 0;
    let bestD = Infinity;
    list.forEach((el, i) => {
      const d = Math.abs(el.offsetLeft - sl);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    return best;
  }

  function sync() {
    const w = pageWidth();
    const list = cards();
    const total = list.length;
    if (w <= 0 || !total) return;

    const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth);
    const idx = nearestIndex();

    if (counter) {
      counter.textContent = `${idx + 1} \u200f/\u200f ${total}`;
    }
    prev.disabled = track.scrollLeft <= 2;
    next.disabled = track.scrollLeft >= maxScroll - 2;
  }

  function go(delta) {
    const w = pageWidth();
    if (w <= 0) return;
    track.scrollBy({ left: delta * w, behavior: scrollBehavior() });
  }

  prev.addEventListener("click", () => go(-1));
  next.addEventListener("click", () => go(1));

  track.addEventListener("scroll", sync, { passive: true });
  window.addEventListener("resize", sync);

  track.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") {
      go(1);
      e.preventDefault();
    } else if (e.key === "ArrowLeft") {
      go(-1);
      e.preventDefault();
    }
  });

  if ("onscrollend" in window) {
    track.addEventListener("scrollend", sync);
  }

  sync();
}

function wireAboutPanelVideo() {
  const v = document.querySelector(".about-full__bg-video");
  if (!v) return;

  const tryPlay = () => {
    const p = v.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
  };

  v.addEventListener("loadeddata", tryPlay);
  v.addEventListener("canplay", tryPlay);
  if (v.readyState >= 2) tryPlay();
}

function wireAdminBuilder() {
  try {
  const params = new URLSearchParams(window.location.search);
  const isAdminMode = params.get("admin") === "1" || localStorage.getItem("laba_admin_enabled") === "1";
  /* v5: stable `data-admin-key` per block (About mobile/desktop, Productions intro) + numeric fallback per section. */
  const ADMIN_CONTENT_VERSION = "v5";
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

  // One-time content migration: keep CTA text consistent with latest copy.
  const migrateLegacyCopy = () => {
    let changed = false;
    const maroonLink =
      '<a class="about-maroon-mention" href="https://www.mako.co.il/news-entertainment/2022_q2/Article-3fdef404834c081026.htm?utm_source=copy_link&amp;utm_medium=share&amp;utm_campaign=n12_article" target="_blank" rel="noopener noreferrer">Maroon5</a>';
    Object.keys(store).forEach((key) => {
      const value = store[key];
      if (typeof value !== "string") return;
      let next = value;
      if (next.includes("רוצה לעבוד יחד?")) {
        next = next.replaceAll("רוצה לעבוד יחד?", "רוצה להפיק שיר?");
      }

      // Normalize Maroon5 mention to an underlined link.
      if (/Moroon5|Maroon5|Maroon 5|mako\.co\.il\/news-entertainment\/2022_q2\/Article-3fdef404834c081026/i.test(next)) {
        next = next.replace(
          /<a[^>]*>\s*(Moroon5|Maroon5|Maroon 5)\s*<\/a>/gi,
          maroonLink
        );
        next = next.replace(/\b(Moroon5|Maroon 5)\b/g, "Maroon5");
        next = next.replace(/שלהקת\s*Maroon5/g, `שלהקת ${maroonLink}`);
      }

      if (next !== value) {
        store[key] = next;
        changed = true;
      }
    });
    if (changed) localStorage.setItem(storageKey, JSON.stringify(store));
  };
  migrateLegacyCopy();

  const editables = $$(editableSelector)
    .filter((el) => !el.closest(".admin-builder"))
    .filter((el) => !el.hasAttribute("data-admin-control"))
    .filter((el) => !el.querySelector("img, video, iframe"))
    .filter((el) => !el.hasAttribute("data-admin-skip"));

  const perSectionEditableCount = new Map();
  const adminKeyFor = (el) => {
    const section = el.closest("section[id]");
    const sid = section?.id ?? "_";
    const stable = el.getAttribute("data-admin-key");
    if (stable) return `${sid}:${stable}`;
    const n = perSectionEditableCount.get(sid) ?? 0;
    perSectionEditableCount.set(sid, n + 1);
    return `${sid}:${n}`;
  };

  // Always apply saved text overrides, even when admin mode is off.
  editables.forEach((el) => {
    const key = adminKeyFor(el);
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
    <div class="admin-builder__hint">עריכה חיה במצב אדמין. עדכון לאתר בפועל רק בלחיצה על «עדכון». ריווח בין שורות נקבע ב־CSS ולא נשמר כאן. טקסטי About (מובייל + «עוד») ודסקטופ, וטקסטי מבוא הפקות — במפתחות יציבים (מחסן v5). אחרי שדרוג מגרסה קודמת: ייצוא ישן + ייבוא ידני או העתקה מחדש.</div>
    <div class="admin-builder__actions">
      <button type="button" class="button button-small button-primary" data-admin-control="apply">עדכון</button>
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
  const draftStore = { ...store };
  const insertHtmlAtCursor = (html) => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    range.deleteContents();
    const frag = range.createContextualFragment(html);
    const last = frag.lastChild;
    range.insertNode(frag);
    if (last) {
      range.setStartAfter(last);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  };
  const persistAll = () => {
    editables.forEach((el) => {
      const key = el.dataset.adminEditable;
      if (!key) return;
      draftStore[key] = el.innerHTML;
    });
  };

  editables.forEach((el) => {
    const key = el.dataset.adminEditable;
    if (!key) return;
    el.contentEditable = "true";
    el.setAttribute("spellcheck", "false");
    el.classList.add("admin-editable");
    el.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      // Keep line breaks deterministic: Enter always inserts <br>
      e.preventDefault();
      insertHtmlAtCursor("<br>");
      draftStore[key] = el.innerHTML;
    });
    el.addEventListener("paste", (e) => {
      const text = e.clipboardData?.getData("text/plain");
      if (typeof text !== "string") return;
      e.preventDefault();
      const safe = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .replace(/\n/g, "<br>");
      insertHtmlAtCursor(safe);
      draftStore[key] = el.innerHTML;
    });
    el.addEventListener("input", () => {
      draftStore[key] = el.innerHTML;
    });
    el.addEventListener("blur", () => {
      draftStore[key] = el.innerHTML;
    });
  });

  const applyDraftToStore = () => {
    persistAll();
    Object.keys(store).forEach((k) => delete store[k]);
    Object.entries(draftStore).forEach(([k, v]) => {
      store[k] = v;
    });
    saveStore();
  };

  panel.addEventListener("click", (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    const action = target.getAttribute("data-admin-control");
    if (!action) return;

    if (action === "export") {
      persistAll();
      const blob = new Blob([JSON.stringify(draftStore, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "laba-admin-content.json";
      a.click();
      URL.revokeObjectURL(url);
    }

    if (action === "apply") {
      applyDraftToStore();
      panel.classList.add("admin-builder--saved");
      const oldTitle = panel.querySelector(".admin-builder__title");
      if (oldTitle) {
        oldTitle.textContent = "עודכן בהצלחה";
        window.setTimeout(() => {
          oldTitle.textContent = "מצב אדמין פעיל";
        }, 1400);
      }
      window.setTimeout(() => panel.classList.remove("admin-builder--saved"), 1400);
    }

    if (action === "import") {
      input.click();
    }

    if (action === "reset") {
      localStorage.removeItem(storageKey);
      window.location.reload();
    }

    if (action === "close") {
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
      const parsed = JSON.parse(text);
      Object.keys(draftStore).forEach((k) => delete draftStore[k]);
      Object.entries(parsed).forEach(([k, v]) => {
        draftStore[k] = v;
      });
      Object.keys(store).forEach((k) => delete store[k]);
      Object.entries(parsed).forEach(([k, v]) => {
        store[k] = v;
      });
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
    ".section-head, #productions.section .section-subtitle-stack, .testimonials-slide, .track, .step-card, .qa, .media-row img, .media-strip img, .tile, .about-text-only"
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
wireStudioStoriesCarousel();
wireTestimonialsCarousel();
wireTracksCarousel();
wireAboutMobileStoryExperience();
wireAboutMobileMoreToggle();
wireAboutMobileBook();
wireAboutPanelVideo();
wireAdminBuilder();

if (yearEl) yearEl.textContent = String(new Date().getFullYear());

if (heroMedia && heroVideo) {
  const markNoVideo = () => heroMedia.classList.add("no-video");
  const clearNoVideo = () => heroMedia.classList.remove("no-video");
  heroVideo.addEventListener("error", markNoVideo);
  heroVideo.addEventListener("loadeddata", clearNoVideo);
  heroVideo.addEventListener("canplay", clearNoVideo);
  heroVideo.addEventListener("playing", clearNoVideo);
  setTimeout(() => {
    if (heroVideo.readyState === 0) markNoVideo();
  }, 4000);
}
