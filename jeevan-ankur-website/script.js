/* ==========================================================
   Jeevan Ankur Seva Foundation - script.js (used on every page)
   Each block below does ONE job. Read the comments to follow along.
   ========================================================== */

const $ = (id) => document.getElementById(id);


/* ---------- 1. Footer year updates by itself ---------- */
const yearEl = $("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();


/* ---------- 2. Header gets a soft shadow after scrolling ---------- */
const header = document.querySelector("header.site");
if (header) {
  window.addEventListener("scroll", () => {
    header.classList.toggle("scrolled", window.scrollY > 10);
  }, { passive: true });
}


/* ---------- 3. Home page: photo preview built from gallery-data.js ---------- */
const preview = $("galPreview");
if (preview && typeof GALLERY !== "undefined") {
  const photos = GALLERY.filter((g) => g.type === "photo").slice(0, 5);
  if (photos.length === 5) preview.classList.add("featured");   // first photo big, four small

  photos.forEach((g) => {
    const link = document.createElement("a");
    link.className = "pv";
    link.href = "gallery.html";
    link.setAttribute("aria-label", "Open gallery: " + g.title);

    const img = document.createElement("img");
    img.src = g.src;
    img.alt = g.title;
    img.loading = "lazy";
    img.addEventListener("error", () => link.remove());   // hide if the file is missing

    link.appendChild(img);
    preview.appendChild(link);
  });
}


/* ---------- 4. Cards fade in as you scroll to them ---------- */
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
if (!reduceMotion && "IntersectionObserver" in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("in");
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  document.querySelectorAll(".xcard, .svc, .act, .way, .pair div, .member, .home-card, .photo-slot, .events, .upi, .pv, .founder-photo, form")
    .forEach((el, i) => {
      el.classList.add("reveal");
      el.style.setProperty("--d", (i % 5) * 0.07 + "s");   // small stagger
      io.observe(el);
    });
}


/* ---------- 5. Contact form: save to backend & open email app ---------- */
const form = $("contactForm");
if (form) {
  const formNote = $("formNote");

  form.addEventListener("submit", (event) => {
    event.preventDefault();                          // we handle sending ourselves

    const name = form.elements["name"].value.trim();
    const contact = form.elements["contact"].value.trim();
    const message = form.elements["message"].value.trim();

    // 1. Send to backend database for administrative review
    fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, contact, message })
    }).catch((err) => console.log("Contact backend sync note:", err));

    // 2. Open email client with message prefilled
    const subject = "Message from website: " + name;
    const body = message + "\n\nName: " + name + "\nContact: " + contact;

    window.location.href =
      "mailto:jeevanankursevafoundation@gmail.com" +
      "?subject=" + encodeURIComponent(subject) +
      "&body=" + encodeURIComponent(body);

    formNote.textContent =
      "Thank you! Your message has been recorded and your email app will open now.";
  });
}


/* ---------- 6. Automatic Visitor Tracking (Backend Analytics) ---------- */
(function trackVisitor() {
  try {
    // Generate or get unique persistent visitor ID
    let vid = localStorage.getItem("_ja_vid");
    if (!vid) {
      vid = "vid_" + Date.now() + "_" + Math.random().toString(36).substr(2, 8);
      localStorage.setItem("_ja_vid", vid);
    }

    // Get current logged in user if any
    let userEmail = null;
    let userId = null;
    const userStr = localStorage.getItem("ja_user");
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        userEmail = u.email;
        userId = u.id;
      } catch (e) {}
    }

    // Determine current page
    let pagePath = window.location.pathname;
    if (!pagePath || pagePath === "/" || pagePath.endsWith("/")) {
      pagePath = "index.html";
    } else {
      const parts = pagePath.split("/");
      pagePath = parts[parts.length - 1];
    }

    const payload = {
      page: pagePath,
      referrer: document.referrer || "Direct",
      screen: `${window.screen.width}x${window.screen.height}`,
      visitorId: vid,
      userEmail: userEmail,
      userId: userId
    };

    // Send tracking beacon to backend
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).catch(() => {
      // Fail silently if server is not active
    });
  } catch (err) {
    console.debug("Tracking note:", err);
  }
})();


/* ---------- 7. Dynamic Authentication State in Navigation ---------- */
(function updateNavAuth() {
  const navAuthLink = $("navAuthLink");
  if (!navAuthLink) return;

  const userStr = localStorage.getItem("ja_user");
  const token = localStorage.getItem("ja_token");

  if (userStr && token) {
    try {
      const user = JSON.parse(userStr);
      if (user.role === "founder") {
        navAuthLink.innerHTML = "👑 Admin Portal";
        navAuthLink.href = "admin.html";
        navAuthLink.title = `Logged in as Founder (${user.name})`;

        // Append a logout link to nav ul
        const navUl = navAuthLink.closest("ul");
        if (navUl && !$("navLogoutItem")) {
          const li = document.createElement("li");
          li.id = "navLogoutItem";
          li.innerHTML = '<a href="#" style="color:var(--muted); font-size:0.85rem">Sign Out</a>';
          li.querySelector("a").addEventListener("click", (e) => {
            e.preventDefault();
            localStorage.removeItem("ja_token");
            localStorage.removeItem("ja_user");
            window.location.reload();
          });
          navUl.appendChild(li);
        }
      } else {
        // Normal logged-in user
        navAuthLink.innerHTML = `👤 ${user.name.split(" ")[0]} (Sign Out)`;
        navAuthLink.href = "#";
        navAuthLink.title = "Click to sign out";
        navAuthLink.addEventListener("click", (e) => {
          e.preventDefault();
          if (confirm(`Sign out from account (${user.name})?`)) {
            localStorage.removeItem("ja_token");
            localStorage.removeItem("ja_user");
            window.location.reload();
          }
        });
      }
    } catch (e) {}
  }
})();


/* ---------- 8. Welcome Toast on Login / Registration ---------- */
(function showWelcomeToast() {
  const urlParams = new URLSearchParams(window.location.search);
  const isLogin = urlParams.get("login") === "success";
  const isRegistered = urlParams.get("registered") === "true";

  if (isLogin || isRegistered) {
    const userStr = localStorage.getItem("ja_user");
    let name = "friend";
    if (userStr) {
      try { name = JSON.parse(userStr).name; } catch (e) {}
    }

    const toast = document.createElement("div");
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: var(--leaf);
      color: #fff;
      padding: 1rem 1.4rem;
      border-radius: 14px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
      z-index: 9999;
      font-size: 0.95rem;
      font-family: var(--sans);
      display: flex;
      align-items: center;
      gap: 0.8rem;
      animation: rise 0.4s ease forwards;
    `;
    toast.innerHTML = `
      <span style="font-size: 1.3rem">👋</span>
      <div>
        <b>Welcome back, ${name}!</b>
        <div style="font-size: 0.82rem; opacity: 0.85">${isRegistered ? "Your account is ready." : "You are logged in."}</div>
      </div>
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transition = "opacity 0.5s ease";
      setTimeout(() => toast.remove(), 500);
    }, 4500);

    // Clean URL query parameters
    window.history.replaceState({}, document.title, window.location.pathname);
  }
})();
