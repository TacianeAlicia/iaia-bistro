document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.querySelector(".menu-toggle");
  const nav = document.querySelector("#main-nav");

  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      nav.classList.toggle("is-open", !open);
    });

    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        toggle.setAttribute("aria-expanded", "false");
        nav.classList.remove("is-open");
      });
    });
  }

  // Lightweight 3D tilt, disabled for reduced motion and touch devices.
  const canTilt = window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
                  !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (canTilt) {
    document.querySelectorAll("[data-tilt]").forEach((card) => {
      card.addEventListener("pointermove", (event) => {
        const rect = card.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        card.style.transform = `perspective(1000px) rotateX(${y * -4}deg) rotateY(${x * 5}deg) translateY(-6px)`;
      });

      card.addEventListener("pointerleave", () => {
        card.style.transform = "";
      });
    });
  }

  // Intersection Observer for entrance micro-interactions.
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));

  // GA4 conversion events.
  document.querySelectorAll("[data-wa-location]").forEach((link) => {
    link.addEventListener("click", () => {
      if (typeof window.gtag === "function") {
        window.gtag("event", "click_whatsapp", {
          location: link.dataset.waLocation || "unknown"
        });
      }
    });
  });

  document.querySelectorAll('[data-track="view_menu"]').forEach((link) => {
    link.addEventListener("click", () => {
      if (typeof window.gtag === "function") {
        window.gtag("event", "view_menu", {
          location: link.closest("section")?.id || "navigation"
        });
      }
    });
  });

  document.querySelectorAll('[data-track="click_location"]').forEach((link) => {
    link.addEventListener("click", () => {
      if (typeof window.gtag === "function") {
        window.gtag("event", "click_location");
      }
    });
  });
});


// Stable internal navigation: when a link targets a section, wait for layout before scrolling.
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      const id = link.getAttribute("href");
      if (!id || id === "#") return;
      const target = document.querySelector(id);
      if (!target) return;
      event.preventDefault();
      history.pushState(null, "", id);
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  // If the page opens directly with #experiencia, ensure it lands on the section.
  if (window.location.hash) {
    requestAnimationFrame(() => {
      const target = document.querySelector(window.location.hash);
      if (target) setTimeout(() => target.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    });
  }
});
