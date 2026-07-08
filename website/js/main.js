// CPM Growth Systems — shared behaviour

(function () {
  // Header scroll state
  const header = document.querySelector(".site-header");
  const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 24);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  // Mobile nav
  const toggle = document.querySelector(".nav-toggle");
  const links = document.querySelector(".nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", () => {
      const open = links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
      toggle.textContent = open ? "✕" : "☰";
    });
    links.querySelectorAll("a").forEach((a) =>
      a.addEventListener("click", () => {
        links.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.textContent = "☰";
      })
    );
  }

  // Scroll reveal
  const revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("visible");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("visible"));
  }

  // Contact form → n8n webhook (workflow: n8n-templates/website-audit-request.json).
  // Set FORM_WEBHOOK_URL to the production webhook URL once the workflow is live,
  // e.g. "https://your-n8n-host/webhook/cpm-audit-request".
  const FORM_WEBHOOK_URL = "https://charliepmars.app.n8n.cloud/webhook/cpm-audit-request";

  const form = document.querySelector("#contact-form");
  if (form) {
    const note = document.querySelector("#form-note");
    const showNote = (msg) => {
      if (!note) return;
      note.textContent = msg;
      note.classList.add("show");
      note.scrollIntoView({ behavior: "smooth", block: "nearest" });
    };

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = new FormData(form);
      const payload = Object.fromEntries(data.entries());
      const firstName = (payload.name || "").trim().split(" ")[0];

      if (!FORM_WEBHOOK_URL) {
        showNote(
          "Thanks " + firstName +
          " — your audit request is noted. This form isn't wired to a backend yet; email charliepmarsh@gmail.com and Charlie will reply within one working day."
        );
        form.reset();
        return;
      }

      const btn = form.querySelector('button[type="submit"]');
      const btnText = btn ? btn.textContent : "";
      if (btn) { btn.disabled = true; btn.textContent = "Sending…"; }
      try {
        const res = await fetch(FORM_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          showNote("Thanks " + firstName + " — your audit request is in. Charlie will reply within one working day.");
          form.reset();
        } else {
          const body = await res.json().catch(() => null);
          const errs = body && body.errors && body.errors.length ? " (" + body.errors.join("; ") + ")" : "";
          showNote("That didn't go through" + errs + ". Please check the required fields, or email charliepmarsh@gmail.com directly.");
        }
      } catch (err) {
        showNote("Connection problem — your request wasn't sent. Please email charliepmarsh@gmail.com and Charlie will reply within one working day.");
      } finally {
        if (btn) { btn.disabled = false; btn.textContent = btnText; }
      }
    });
  }

  // Footer year
  document.querySelectorAll("[data-year]").forEach((el) => {
    el.textContent = new Date().getFullYear();
  });
})();
