/* ==========================================================
   gallery.js  -  builds the gallery page from gallery-data.js
   Features: filter buttons, animated grid, full-screen viewer with
   next / previous, keyboard + swipe, video, and a slideshow.
   ========================================================== */

(function () {
  const SLIDE_MS = 4000;                       // how long each photo shows in the slideshow

  const grid = document.getElementById("galleryGrid");
  if (!grid || typeof GALLERY === "undefined") return;

  const chipsBox = document.getElementById("chips");
  const countEl = document.getElementById("galCount");
  const emptyEl = document.getElementById("galEmpty");
  const slideBtn = document.getElementById("slideBtn");

  const items = GALLERY.slice();
  let filter = "all";
  let current = [];                            // the items currently shown (after filtering)


  /* ---------- Filter buttons (built from the data) ---------- */
  const photoCount = items.filter((g) => g.type === "photo").length;
  const videoCount = items.filter((g) => g.type === "video").length;
  const categories = [...new Set(items.map((g) => g.category).filter(Boolean))];

  const chips = [{ key: "all", label: "All", n: items.length }];
  if (photoCount) chips.push({ key: "type:photo", label: "Photos", n: photoCount });
  if (videoCount) chips.push({ key: "type:video", label: "Videos", n: videoCount });
  categories.forEach((c) => chips.push({
    key: "cat:" + c, label: c, n: items.filter((g) => g.category === c).length
  }));

  chips.forEach((c) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip";
    b.dataset.key = c.key;
    b.setAttribute("aria-pressed", c.key === filter);
    b.innerHTML = c.label + "<small>" + c.n + "</small>";
    b.addEventListener("click", () => {
      filter = c.key;
      chipsBox.querySelectorAll(".chip").forEach((x) => x.setAttribute("aria-pressed", x === b));
      render();
    });
    chipsBox.appendChild(b);
  });

  function matches(g) {
    if (filter === "all") return true;
    if (filter === "type:photo") return g.type === "photo";
    if (filter === "type:video") return g.type === "video";
    return "cat:" + g.category === filter;
  }


  /* ---------- Draw the grid ---------- */
  const PLAY_SVG = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';

  function render() {
    current = items.filter(matches);
    grid.innerHTML = "";

    current.forEach((g, i) => {
      const tile = document.createElement("button");
      tile.type = "button";
      tile.className = "g-item";
      tile.style.setProperty("--d", Math.min(i, 12) * 0.05 + "s");   // tiles appear one after another
      tile.setAttribute("aria-label", (g.type === "video" ? "Play video: " : "Open photo: ") + g.title);

      let media;
      if (g.type === "video" && !g.poster) {
        // no thumbnail picture given: use the first frame of the video itself
        media = document.createElement("video");
        media.muted = true;
        media.preload = "metadata";
        media.src = g.src + "#t=0.5";
        media.addEventListener("loadeddata", () => tile.classList.add("loaded"));
      } else {
        media = new Image();
        media.alt = "";
        media.loading = "lazy";
        media.decoding = "async";
        media.addEventListener("load", () => tile.classList.add("loaded"));
        media.src = g.type === "video" ? g.poster : g.src;
      }
      media.addEventListener("error", () => tile.classList.add("broken"));
      tile.appendChild(media);

      if (g.category || g.type === "video") {
        const tag = document.createElement("span");
        tag.className = "g-tag";
        tag.textContent = g.type === "video" ? "Video" : g.category;
        tile.appendChild(tag);
      }
      if (g.type === "video") {
        const play = document.createElement("span");
        play.className = "g-play";
        play.innerHTML = PLAY_SVG;
        tile.appendChild(play);
      }
      const cap = document.createElement("span");
      cap.className = "g-cap";
      cap.textContent = g.title;
      tile.appendChild(cap);

      tile.addEventListener("click", () => openAt(i));
      grid.appendChild(tile);
    });

    countEl.textContent = "Showing " + current.length + (current.length === 1 ? " item" : " items");
    emptyEl.hidden = current.length > 0;
    slideBtn.disabled = current.length === 0;
  }


  /* ---------- Full-screen viewer ---------- */
  const lb = document.getElementById("lightbox");
  const lbImg = document.getElementById("lbImg");
  const lbVideo = document.getElementById("lbVideo");
  const lbCap = document.getElementById("lbCap");
  const lbCount = document.getElementById("lbCount");
  const lbPlay = document.getElementById("lbPlay");
  const lbProg = document.getElementById("lbProg");

  let pos = 0;
  let playing = false;
  let timer = null;

  lb.style.setProperty("--slide", SLIDE_MS + "ms");

  function openAt(i) {
    lb.showModal();
    show(i);
  }

  function show(i) {
    pos = (i + current.length) % current.length;      // wrap around at both ends
    const g = current[pos];
    const isVideo = g.type === "video";

    lbImg.classList.toggle("show", !isVideo);
    lbVideo.classList.toggle("show", isVideo);

    if (isVideo) {
      lbImg.removeAttribute("src");
      lbVideo.poster = g.poster || "";
      lbVideo.src = g.src;
      lbVideo.play().catch(() => {});
    } else {
      lbVideo.pause();
      lbVideo.removeAttribute("src");
      lbVideo.load();
      lbImg.src = g.src;
      lbImg.alt = g.title;
    }

    lbCap.textContent = g.title;
    lbCount.textContent = (pos + 1) + " / " + current.length;
    lb.querySelectorAll("#lbPrev, #lbNext").forEach((b) => b.hidden = current.length < 2);

    // load the next photo in the background so it opens instantly
    const nxt = current[(pos + 1) % current.length];
    if (nxt && nxt.type === "photo") new Image().src = nxt.src;

    schedule();
  }

  const next = () => show(pos + 1);
  const prev = () => show(pos - 1);

  // slideshow: photos wait SLIDE_MS, videos play to the end, then move on
  function schedule() {
    clearTimeout(timer);
    lbProg.classList.remove("run");
    lbVideo.onended = null;
    if (!playing) return;

    if (current[pos].type === "video") {
      lbVideo.onended = next;
    } else {
      void lbProg.offsetWidth;                         // restart the progress bar animation
      lbProg.classList.add("run");
      timer = setTimeout(next, SLIDE_MS);
    }
  }

  function setPlaying(on) {
    playing = on;
    lbPlay.innerHTML = on ? "&#10074;&#10074; Pause" : "&#9654; Slideshow";
    schedule();
  }

  document.getElementById("lbNext").addEventListener("click", next);
  document.getElementById("lbPrev").addEventListener("click", prev);
  document.getElementById("lbClose").addEventListener("click", () => lb.close());
  lbPlay.addEventListener("click", () => setPlaying(!playing));
  slideBtn.addEventListener("click", () => { openAt(0); setPlaying(true); });

  // click the dark area to close
  lb.addEventListener("click", (e) => { if (e.target === lb) lb.close(); });

  // stop everything when the viewer closes
  lb.addEventListener("close", () => {
    setPlaying(false);
    lbVideo.pause();
    lbVideo.removeAttribute("src");
    lbVideo.load();
  });

  // keyboard: arrows for next / previous (Esc closes by itself)
  document.addEventListener("keydown", (e) => {
    if (!lb.open) return;
    if (e.key === "ArrowRight") next();
    if (e.key === "ArrowLeft") prev();
  });

  // touch: swipe left / right
  let startX = null;
  lb.addEventListener("touchstart", (e) => { startX = e.changedTouches[0].clientX; }, { passive: true });
  lb.addEventListener("touchend", (e) => {
    if (startX === null) return;
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 50) (dx < 0 ? next : prev)();
    startX = null;
  }, { passive: true });

  render();
})();
