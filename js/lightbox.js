/* =========================================================
   LIGHTBOX – click a picture to see it big
   Works on the projects, ideas, digital and handmade pages.
   - Click a picture  -> it opens big on a dark background
   - Click outside the picture, press Esc, or tap the red X -> it closes
   - Arrow buttons / ← → keys / swipe left-right -> next or previous picture
   Nothing else needs to be changed: it finds every picture inside
   the .card and .note blocks by itself, including ones you add later.
   ========================================================= */
(function () {
  "use strict";

  // ---- 1) the look of the viewer (kept here so this is the only file you need) ----
  var css = `
    .lb-clickable { cursor: zoom-in; }
    .lb-clickable:focus-visible { outline: 4px solid #ff4d6d; outline-offset: 4px; }

    .lb-overlay {
      position: fixed; inset: 0; z-index: 1000;
      display: none; align-items: center; justify-content: center;
      background: rgba(10, 8, 6, 0.93);
      padding: 56px 16px 24px;
    }
    .lb-overlay.lb-open { display: flex; animation: lb-fade 0.2s ease; }

    .lb-figure {
      margin: 0; max-width: 100%; max-height: 100%;
      display: flex; flex-direction: column; align-items: center; gap: 14px;
      animation: lb-pop 0.28s cubic-bezier(0.2, 0.9, 0.3, 1.25);
    }
    .lb-frame {
      background: #f5f0e0; padding: 12px;
      box-shadow: 8px 10px 0 rgba(0, 0, 0, 0.5);
      transform: rotate(-0.8deg);
      max-width: 100%; max-height: calc(100vh - 190px);
      display: flex;
    }
    .lb-frame img {
      display: block;
      max-width: min(94vw, 1400px);
      max-height: calc(100vh - 215px);
      width: auto; height: auto; object-fit: contain;
      border: 2px solid #1b1b1b;
    }
    .lb-frame .lb-placeholder {
      width: min(86vw, 860px); aspect-ratio: 4 / 3; max-height: calc(100vh - 215px);
      display: grid; place-items: center;
      background: repeating-linear-gradient(45deg, #ddd5bd 0 14px, #e9e2cf 14px 28px);
      border: 2px solid #1b1b1b;
      font-family: var(--marker, "Permanent Marker", cursive);
      font-size: clamp(28px, 6vw, 64px); color: #6a6150;
    }
    .lb-caption {
      max-width: min(90vw, 760px); text-align: center; color: #f5f0e0;
      font-family: var(--hand, "Caveat", cursive); font-size: 26px; line-height: 1.15;
      text-shadow: 2px 2px 0 #000;
    }
    .lb-caption b {
      display: block; font-family: var(--marker, "Permanent Marker", cursive);
      font-weight: normal; font-size: 30px; margin-bottom: 2px;
    }
    .lb-count { font-family: var(--marker, "Permanent Marker", cursive); font-size: 16px; opacity: 0.7; }

    .lb-btn {
      position: absolute; z-index: 2;
      display: block; width: 58px; height: 58px; padding: 0;
      background: none; border: 0; cursor: pointer; line-height: 0;
      filter: drop-shadow(3px 4px 0 rgba(0, 0, 0, 0.5));
      transition: transform 0.15s ease;
    }
    .lb-btn img { display: block; width: 100%; height: 100%; pointer-events: none; }
    .lb-btn:hover, .lb-btn:focus-visible { transform: scale(1.12) rotate(-6deg); outline: none; }
    .lb-close { top: 14px; right: 14px; }
    .lb-prev  { left: 14px;  top: 50%; margin-top: -29px; }
    .lb-next  { right: 14px; top: 50%; margin-top: -29px; }
    .lb-hidden { display: none; }

    body.lb-lock { overflow: hidden; }

    @keyframes lb-fade { from { opacity: 0; } to { opacity: 1; } }
    @keyframes lb-pop  { from { opacity: 0; transform: scale(0.85); } to { opacity: 1; transform: scale(1); } }

    @media (max-width: 700px) {
      .lb-btn { width: 48px; height: 48px; }
      .lb-prev, .lb-next { top: auto; bottom: 14px; margin-top: 0; }
      .lb-prev { left: 22%; } .lb-next { right: 22%; }
      .lb-overlay { padding: 64px 10px 80px; }
      .lb-frame img { max-height: calc(100vh - 290px); }
      .lb-caption { font-size: 22px; } .lb-caption b { font-size: 24px; }
    }
    @media (prefers-reduced-motion: reduce) {
      .lb-overlay.lb-open, .lb-figure { animation: none; }
    }
  `;
  var style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  // ---- 2) the viewer itself ----
  var overlay = document.createElement("div");
  overlay.className = "lb-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "Picture viewer");
  overlay.innerHTML =
    '<button class="lb-btn lb-close" type="button" aria-label="Close"><img src="assets/exit-x.png" alt=""></button>' +
    '<button class="lb-btn lb-prev" type="button" aria-label="Previous picture"><img src="assets/arrow-left.png" alt=""></button>' +
    '<button class="lb-btn lb-next" type="button" aria-label="Next picture"><img src="assets/arrow-right.png" alt=""></button>' +
    '<figure class="lb-figure">' +
      '<div class="lb-frame"></div>' +
      '<figcaption class="lb-caption"></figcaption>' +
    '</figure>';
  document.body.appendChild(overlay);

  var frame = overlay.querySelector(".lb-frame");
  var caption = overlay.querySelector(".lb-caption");
  var btnClose = overlay.querySelector(".lb-close");
  var btnPrev = overlay.querySelector(".lb-prev");
  var btnNext = overlay.querySelector(".lb-next");

  var items = [];      // every picture on the page, in order
  var index = 0;
  var lastFocus = null;

  // Which things count as "a picture"? Real <img> inside a card/note,
  // or the grey "image" placeholder boxes that stand in for them.
  var SELECTOR = ".card img, .note img, .card .placeholder, .note .placeholder, " +
                 ".win .canvas img, .win .canvas .placeholder, .piece .pic img, .piece .pic .placeholder";

  function collect() {
    items = Array.prototype.slice.call(document.querySelectorAll(SELECTOR));
    items.forEach(function (el) {
      if (el.dataset.lbReady) return;
      el.dataset.lbReady = "1";
      el.classList.add("lb-clickable");
      el.setAttribute("tabindex", "0");
      el.setAttribute("role", "button");
      el.addEventListener("click", function () { open(items.indexOf(el)); });
      el.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(items.indexOf(el)); }
      });
    });
    btnPrev.classList.toggle("lb-hidden", items.length < 2);
    btnNext.classList.toggle("lb-hidden", items.length < 2);
  }

  function captionFor(el) {
    var box = el.closest(".card, .note, .piece, .win");
    var out = "";
    if (box) {
      var title = box.querySelector("h2");
      var text = box.querySelector("p");
      if (title) out += "<b></b>";
      var wrap = document.createElement("div");
      wrap.innerHTML = out;
      if (title) wrap.querySelector("b").textContent = title.textContent;
      if (text) {
        var span = document.createElement("span");
        span.textContent = text.textContent;
        wrap.appendChild(span);
      }
      return wrap;
    }
    return document.createElement("div");
  }

  function show(i) {
    index = (i + items.length) % items.length;
    var el = items[index];
    frame.innerHTML = "";

    if (el.tagName === "IMG") {
      var big = document.createElement("img");
      big.src = el.currentSrc || el.src;      // same file, shown large
      big.alt = el.alt || "";
      frame.appendChild(big);
    } else {
      var ph = document.createElement("div");
      ph.className = "lb-placeholder";
      ph.textContent = el.textContent;
      frame.appendChild(ph);
    }

    caption.innerHTML = "";
    caption.appendChild(captionFor(el));
    if (items.length > 1) {
      var count = document.createElement("div");
      count.className = "lb-count";
      count.textContent = (index + 1) + " / " + items.length;
      caption.appendChild(count);
    }
  }

  function open(i) {
    if (i < 0) return;
    lastFocus = document.activeElement;
    show(i);
    overlay.classList.add("lb-open");
    document.body.classList.add("lb-lock");
    btnClose.focus();
  }

  function close() {
    overlay.classList.remove("lb-open");
    document.body.classList.remove("lb-lock");
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function isOpen() { return overlay.classList.contains("lb-open"); }

  btnClose.addEventListener("click", close);
  btnPrev.addEventListener("click", function (e) { e.stopPropagation(); show(index - 1); });
  btnNext.addEventListener("click", function (e) { e.stopPropagation(); show(index + 1); });

  // click on the dark area (not on the picture) closes it
  overlay.addEventListener("click", function (e) {
    if (e.target === overlay || e.target.classList.contains("lb-figure")) close();
  });

  document.addEventListener("keydown", function (e) {
    if (!isOpen()) return;
    if (e.key === "Escape") close();
    else if (e.key === "ArrowLeft") show(index - 1);
    else if (e.key === "ArrowRight") show(index + 1);
  });

  // swipe on phones
  var startX = null;
  overlay.addEventListener("touchstart", function (e) { startX = e.touches[0].clientX; }, { passive: true });
  overlay.addEventListener("touchend", function (e) {
    if (startX === null || items.length < 2) return;
    var dx = e.changedTouches[0].clientX - startX;
    startX = null;
    if (Math.abs(dx) > 50) show(index + (dx < 0 ? 1 : -1));
  }, { passive: true });

  collect();
})();
