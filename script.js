(() => {
  "use strict";

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const header = document.querySelector("[data-header]");
  const menuToggle = document.querySelector("[data-menu-toggle]");
  const mobileMenu = document.querySelector("[data-mobile-menu]");
  const mobileLinks = mobileMenu ? [...mobileMenu.querySelectorAll("a[href^='#']")] : [];
  const toast = document.querySelector("[data-toast]");
  const themeButtons = [...document.querySelectorAll("[data-theme-toggle]")];
  const themeColor = document.querySelector('meta[name="theme-color"]');
  const systemTheme = window.matchMedia("(prefers-color-scheme: light)");
  let toastTimer;

  const applyTheme = (theme, persist = false) => {
    const nextTheme = theme === "light" ? "light" : "dark";
    document.documentElement.dataset.theme = nextTheme;
    if (themeColor) themeColor.content = nextTheme === "light" ? "#ffffff" : "#000000";
    themeButtons.forEach((button) => {
      const lightMode = nextTheme === "light";
      button.setAttribute("aria-pressed", String(lightMode));
      button.setAttribute("aria-label", lightMode ? "Passer au thème sombre" : "Passer au thème clair");
      button.title = lightMode ? "Thème sombre" : "Thème clair";
    });
    if (persist) {
      document.documentElement.dataset.themeSource = "manual";
      try { localStorage.setItem("bmec-theme", nextTheme); } catch {}
    }
  };

  applyTheme(document.documentElement.dataset.theme || (systemTheme.matches ? "light" : "dark"));
  systemTheme.addEventListener("change", (event) => {
    if (document.documentElement.dataset.themeSource !== "manual") {
      applyTheme(event.matches ? "light" : "dark");
    }
  });
  themeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      applyTheme(document.documentElement.dataset.theme === "light" ? "dark" : "light", true);
    });
  });

  document.querySelectorAll(".footer-bottom [data-year]").forEach((node) => {
    node.textContent = String(new Date().getFullYear());
  });

  const navLinks = [...document.querySelectorAll(".desktop-nav a[href^='#']")];
  const navSections = navLinks
    .map((link) => ({
      link,
      section: document.querySelector(link.getAttribute("href"))
    }))
    .filter((item) => item.section);
  let interfaceFrame = 0;

  const updateActiveNavigation = () => {
    if (!navSections.length) return;

    const orderedSections = [...navSections].sort((a, b) => a.section.offsetTop - b.section.offsetTop);
    const marker = window.scrollY + (header?.offsetHeight || 0) + Math.min(window.innerHeight * 0.28, 220);
    let activeItem = orderedSections[0];

    for (const item of orderedSections) {
      if (item.section.offsetTop > marker) break;
      activeItem = item;
    }

    const pageBottom = Math.ceil(window.scrollY + window.innerHeight);
    if (pageBottom >= document.documentElement.scrollHeight - 2) {
      activeItem = orderedSections[orderedSections.length - 1];
    }

    navLinks.forEach((link) => {
      const selected = link === activeItem.link;
      link.classList.toggle("is-active", selected);
      if (selected) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  };

  const updateInterface = () => {
    header?.classList.toggle("is-scrolled", window.scrollY > 16);
    updateActiveNavigation();
    interfaceFrame = 0;
  };

  const queueInterfaceUpdate = () => {
    if (interfaceFrame) return;
    interfaceFrame = window.requestAnimationFrame(updateInterface);
  };

  updateInterface();
  window.addEventListener("scroll", queueInterfaceUpdate, { passive: true });
  window.addEventListener("resize", queueInterfaceUpdate, { passive: true });

  const setMenu = (open) => {
    if (!menuToggle || !mobileMenu) return;
    menuToggle.setAttribute("aria-expanded", String(open));
    menuToggle.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
    mobileMenu.classList.toggle("is-open", open);
    document.body.classList.toggle("menu-open", open);
  };

  if (menuToggle && mobileMenu) {
    menuToggle.addEventListener("click", () => {
      setMenu(menuToggle.getAttribute("aria-expanded") !== "true");
    });
    mobileLinks.forEach((link) => link.addEventListener("click", () => setMenu(false)));
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setMenu(false);
  });

  const revealNodes = [...document.querySelectorAll(".reveal")];
  if (reducedMotion || !("IntersectionObserver" in window)) {
    revealNodes.forEach((node) => node.classList.add("is-visible"));
  } else {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -6% 0px" });
    revealNodes.forEach((node) => revealObserver.observe(node));
  }

  const statsSection = document.querySelector("[data-stats]");
  const statCards = statsSection ? [...statsSection.querySelectorAll("[data-stat-card]")] : [];

  const finishStatCounter = (card, counter, target) => {
    counter.textContent = String(target);
    card.classList.remove("is-counting");
    card.classList.add("is-counted");
  };

  const animateStatCounter = (card, order) => {
    const counter = card.querySelector("[data-counter]");
    const target = Number(counter?.dataset.counter);
    if (!counter || !Number.isFinite(target)) return;

    counter.textContent = "0";
    card.classList.add("is-counting");
    const duration = 1250 + order * 85;
    const startedAt = performance.now();

    const drawCounter = (now) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 4);
      counter.textContent = String(Math.round(target * easedProgress));

      if (progress < 1) {
        window.requestAnimationFrame(drawCounter);
      } else {
        finishStatCounter(card, counter, target);
      }
    };

    window.requestAnimationFrame(drawCounter);
  };

  const activateStats = () => {
    if (!statsSection || statsSection.classList.contains("is-active")) return;
    statsSection.classList.add("is-active");

    statCards.forEach((card, order) => {
      const counter = card.querySelector("[data-counter]");
      const target = Number(counter?.dataset.counter);
      if (!counter || !Number.isFinite(target)) return;

      if (reducedMotion) {
        finishStatCounter(card, counter, target);
        return;
      }

      window.setTimeout(() => animateStatCounter(card, order), order * 105);
    });
  };

  if (statsSection) {
    if (reducedMotion || !("IntersectionObserver" in window)) {
      activateStats();
    } else {
      const statsObserver = new IntersectionObserver((entries, observer) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        activateStats();
        observer.disconnect();
      }, { threshold: 0.28, rootMargin: "0px 0px -8% 0px" });
      statsObserver.observe(statsSection);
    }
  }

  if (!reducedMotion && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    statCards.forEach((card) => {
      card.addEventListener("pointermove", (event) => {
        const rect = card.getBoundingClientRect();
        const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
        const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
        card.style.setProperty("--spot-x", `${(x * 100).toFixed(1)}%`);
        card.style.setProperty("--spot-y", `${(y * 100).toFixed(1)}%`);
        card.style.setProperty("--tilt-x", `${((.5 - y) * 3.2).toFixed(2)}deg`);
        card.style.setProperty("--tilt-y", `${((x - .5) * 4.2).toFixed(2)}deg`);
      });

      card.addEventListener("pointerleave", () => {
        card.style.setProperty("--spot-x", "50%");
        card.style.setProperty("--spot-y", "50%");
        card.style.setProperty("--tilt-x", "0deg");
        card.style.setProperty("--tilt-y", "0deg");
      });
    });
  }

  const filterButtons = [...document.querySelectorAll("[data-filter]")];
  const projectCards = [...document.querySelectorAll("[data-category]")];
  const yearFilter = document.querySelector("[data-year-filter]");
  const realisationsGrid = document.querySelector(".realisations-grid");

  const activeProjectFilter = () => filterButtons.find((button) => button.classList.contains("is-active"))?.dataset.filter || "all";

  const applyProjectFilters = () => {
    const category = activeProjectFilter();
    const year = yearFilter?.value || "all";

    projectCards.forEach((card) => {
      const categories = (card.dataset.category || "").split(" ");
      const matchesCategory = category === "all" || categories.includes(category);
      const matchesYear = year === "all" || card.dataset.year === year;
      card.classList.toggle("is-hidden", !(matchesCategory && matchesYear));
    });
  };

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      filterButtons.forEach((item) => {
        const selected = item === button;
        item.classList.toggle("is-active", selected);
        item.setAttribute("aria-pressed", String(selected));
      });
      applyProjectFilters();
    });
  });

  yearFilter?.addEventListener("change", applyProjectFilters);

  const blogFilterButtons = [...document.querySelectorAll("[data-blog-filter]")];
  const blogCards = [...document.querySelectorAll("[data-blog-card]")];

  blogFilterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const filter = button.dataset.blogFilter;
      blogFilterButtons.forEach((item) => {
        const selected = item === button;
        item.classList.toggle("is-active", selected);
        item.setAttribute("aria-pressed", String(selected));
      });
      blogCards.forEach((card) => {
        const categories = (card.dataset.blogCategory || "").split(" ");
        card.classList.toggle("is-hidden", filter !== "all" && !categories.includes(filter));
      });
    });
  });

  const showToast = (title, message) => {
    if (!toast) return;
    const titleNode = toast.querySelector("strong");
    const messageNode = toast.querySelector("span");
    if (titleNode) titleNode.textContent = title;
    if (messageNode) messageNode.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 6500);
  };

  if (toast) {
    const close = toast.querySelector("button");
    if (close) close.addEventListener("click", () => toast.classList.remove("is-visible"));
  }

  document.querySelectorAll(".project-card__content button").forEach((button) => {
    button.addEventListener("click", () => {
      const title = button.closest(".project-card")?.querySelector("h3")?.textContent || "Projet";
      showToast(title, "Projet suivi par les équipes B-MEC SARL à Goma. Retrouvez nos méthodes et retours d’expérience dans le journal de chantier.");
    });
  });

  const form = document.querySelector("[data-contact-form]");
  if (form) {
    const fields = [...form.querySelectorAll("input[required], select[required], textarea[required]")];
    const validateField = (field) => {
      const label = field.closest("label");
      const valid = field.checkValidity();
      label?.classList.toggle("has-error", !valid);
      field.setAttribute("aria-invalid", String(!valid));
      return valid;
    };

    fields.forEach((field) => {
      field.addEventListener("blur", () => validateField(field));
      field.addEventListener("input", () => {
        if (field.closest("label")?.classList.contains("has-error")) validateField(field);
      });
      field.addEventListener("change", () => validateField(field));
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const invalid = fields.filter((field) => !validateField(field));
      if (invalid.length) {
        invalid[0].focus();
        showToast("Informations incomplètes", "Vérifiez les champs signalés avant de poursuivre.");
        return;
      }
      showToast("Formulaire validé", "La demande est prête. Connectez le formulaire à un service d’envoi avant la mise en ligne.");
    });
  }

  const dialogTriggers = [...document.querySelectorAll("[data-dialog]")];
  dialogTriggers.forEach((trigger) => {
    trigger.addEventListener("click", () => {
      const dialog = document.querySelector(`[data-dialog-modal="${trigger.dataset.dialog}"]`);
      if (dialog && typeof dialog.showModal === "function") dialog.showModal();
    });
  });

  document.querySelectorAll("[data-dialog-modal]").forEach((dialog) => {
    const closeButton = dialog.querySelector("[data-dialog-close]");
    closeButton?.addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (event) => {
      const rect = dialog.getBoundingClientRect();
      const outside = event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
      if (outside) dialog.close();
    });
  });

  document.querySelectorAll("img").forEach((image) => {
    image.addEventListener("error", () => {
      image.style.opacity = "0";
      image.parentElement?.classList.add("image-unavailable");
    });
  });

  if (!reducedMotion) {
    const heroScene = document.querySelector("[data-hero-parallax]");
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    if (heroScene && finePointer) {
      heroScene.addEventListener("pointermove", (event) => {
        const rect = heroScene.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width;
        const y = (event.clientY - rect.top) / rect.height;
        heroScene.style.setProperty("--tilt-x", `${((.5 - y) * 2.4).toFixed(2)}deg`);
        heroScene.style.setProperty("--tilt-y", `${((x - .5) * 3.2).toFixed(2)}deg`);
      });

      heroScene.addEventListener("pointerleave", () => {
        heroScene.style.setProperty("--tilt-x", "0deg");
        heroScene.style.setProperty("--tilt-y", "0deg");
      });
    }

    const safetyImage = document.querySelector(".safety__image");
    const updateParallax = () => {
      if (heroScene && window.innerWidth >= 900) {
        const heroSection = heroScene.closest(".hero");
        const heroRect = heroSection?.getBoundingClientRect();
        if (heroRect && heroRect.bottom >= 0 && heroRect.top <= window.innerHeight) {
          const progress = Math.max(-1, Math.min(1, (window.innerHeight / 2 - (heroRect.top + heroRect.height / 2)) / window.innerHeight));
          heroScene.style.setProperty("--hero-scroll-y", `${(progress * -10).toFixed(2)}px`);
        }
      }

      if (safetyImage && window.innerWidth >= 900) {
        const section = safetyImage.closest(".safety");
        if (!section) return;
        const rect = section.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > window.innerHeight) return;
        const offset = (window.innerHeight / 2 - (rect.top + rect.height / 2)) * 0.035;
        safetyImage.style.transform = `scale(1.05) translateY(${offset}px)`;
      }
    };
    window.addEventListener("scroll", updateParallax, { passive: true });
    updateParallax();
  }

  const capabilityTrack = document.querySelector(".capability-strip__track");
  if (capabilityTrack && capabilityTrack.dataset.loopReady !== "true") {
    const originalItems = [...capabilityTrack.children];
    const signature = (node) => `${node.tagName}:${node.textContent.trim()}`;
    const firstSignature = originalItems[0] ? signature(originalItems[0]) : "";
    let repeatIndex = -1;

    for (let index = 1; index < originalItems.length; index += 1) {
      if (signature(originalItems[index]) === firstSignature) {
        repeatIndex = index;
        break;
      }
    }

    const cycleItems = (repeatIndex > 0 ? originalItems.slice(0, repeatIndex) : originalItems)
      .map((node) => node.cloneNode(true));

    if (cycleItems.length) {
      const makeSegment = () => {
        const segment = document.createElement("div");
        segment.className = "capability-strip__segment";
        segment.setAttribute("aria-hidden", "true");
        cycleItems.forEach((node) => segment.appendChild(node.cloneNode(true)));
        return segment;
      };

      capabilityTrack.replaceChildren(makeSegment(), makeSegment());
      capabilityTrack.dataset.loopReady = "true";
    }
  }

  const backToTop = document.querySelector("[data-back-to-top]");
  if (backToTop) {
    const updateBackToTop = () => {
      backToTop.classList.toggle("is-visible", window.scrollY > Math.min(260, window.innerHeight * 0.32));
    };
    backToTop.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
    });
    window.addEventListener("scroll", updateBackToTop, { passive: true });
    updateBackToTop();
  }

})();
