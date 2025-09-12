// MOBILE NAV TOGGLE
(function () {
  const btn = document.querySelector(".nav-toggle");
  const nav = document.querySelector("nav[aria-label]");
  if (!btn || !nav) return;
  btn.addEventListener("click", () => {
    const expanded = btn.getAttribute("aria-expanded") === "true";
    btn.setAttribute("aria-expanded", String(!expanded));
    nav.classList.toggle("open");
    if (!expanded) {
      nav.querySelector("a")?.focus();
    } else {
      btn.focus();
    }
  });
})();

// Smooth scroll for internal links
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener("click", function (e) {
    const href = this.getAttribute("href");
    if (href === "#" || href === "#!") return;
    const target = document.querySelector(href);
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
    }
  });
});

// Escape closes nav
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    const nav = document.querySelector("nav[aria-label]");
    const btn = document.querySelector(".nav-toggle");
    if (nav && nav.classList.contains("open")) {
      nav.classList.remove("open");
      btn?.setAttribute("aria-expanded", "false");
      btn?.focus();
    }
  }
});

// Dynamic year in footer
document.getElementById("year").textContent = new Date().getFullYear();
