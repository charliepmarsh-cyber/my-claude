// CPM Growth Systems — case study page behaviour
// (main.js handles header, mobile nav, reveals, footer year)

(function () {
  // Reading progress bar
  const bar = document.querySelector(".progress-bar");
  if (bar) {
    const update = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      bar.style.width = max > 0 ? (window.scrollY / max) * 100 + "%" : "0%";
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });
  }

  // Chapter nav — highlight the section in view
  const chapterLinks = Array.from(document.querySelectorAll(".chapter-nav a"));
  const sections = chapterLinks
    .map((a) => document.querySelector(a.getAttribute("href")))
    .filter(Boolean);

  if (sections.length && "IntersectionObserver" in window) {
    const setActive = (id) => {
      chapterLinks.forEach((a) =>
        a.classList.toggle("active", a.getAttribute("href") === "#" + id)
      );
    };
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id);
        });
      },
      // Fire when a section crosses the upper-middle of the viewport
      { rootMargin: "-15% 0px -70% 0px" }
    );
    sections.forEach((s) => io.observe(s));
  }

  // Save as PDF — open all expandables so print captures full content
  const openedForPrint = [];
  window.addEventListener("beforeprint", () => {
    document.querySelectorAll("details.expand:not([open])").forEach((d) => {
      d.setAttribute("open", "");
      openedForPrint.push(d);
    });
  });
  window.addEventListener("afterprint", () => {
    openedForPrint.splice(0).forEach((d) => d.removeAttribute("open"));
  });

  document.querySelectorAll(".print-btn").forEach((btn) =>
    btn.addEventListener("click", () => window.print())
  );
})();
