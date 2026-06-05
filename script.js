(function () {
  "use strict";

  const root = document.documentElement;
  const body = document.body;

  function safeStorageGet(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function safeStorageSet(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (error) {
      return false;
    }
    return true;
  }

  function applyTheme(theme) {
    if (theme === "dark") {
      root.setAttribute("data-theme", "dark");
    } else {
      root.removeAttribute("data-theme");
    }

    document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
      button.setAttribute(
        "aria-label",
        theme === "dark" ? "Switch to light theme" : "Switch to dark theme"
      );
    });
  }

  function initTheme() {
    const savedTheme = safeStorageGet("quiet-stack-theme");
    const prefersDark = window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initialTheme = savedTheme || (prefersDark ? "dark" : "light");

    applyTheme(initialTheme);

    document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
      button.addEventListener("click", () => {
        const nextTheme = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
        applyTheme(nextTheme);
        safeStorageSet("quiet-stack-theme", nextTheme);
      });
    });
  }

  function initMobileNav() {
    const toggle = document.querySelector("[data-menu-toggle]");
    const nav = document.getElementById("site-nav");

    if (!toggle || !nav) {
      return;
    }

    function closeNav() {
      body.classList.remove("nav-open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Open navigation menu");
    }

    function openNav() {
      body.classList.add("nav-open");
      toggle.setAttribute("aria-expanded", "true");
      toggle.setAttribute("aria-label", "Close navigation menu");
    }

    toggle.addEventListener("click", () => {
      if (body.classList.contains("nav-open")) {
        closeNav();
      } else {
        openNav();
      }
    });

    nav.addEventListener("click", (event) => {
      const link = event.target.closest("a");
      if (link) {
        closeNav();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeNav();
      }
    });

    window.addEventListener("resize", () => {
      if (window.matchMedia("(min-width: 58rem)").matches) {
        closeNav();
      }
    });
  }

  function initDropdowns() {
    const dropdownToggles = document.querySelectorAll("[data-dropdown-toggle]");

    function closeDropdown(button) {
      const menuId = button.getAttribute("aria-controls");
      const menu = menuId ? document.getElementById(menuId) : null;

      button.setAttribute("aria-expanded", "false");
      if (menu) {
        menu.hidden = true;
      }
    }

    function closeAllDropdowns(exceptButton) {
      dropdownToggles.forEach((button) => {
        if (button !== exceptButton) {
          closeDropdown(button);
        }
      });
    }

    dropdownToggles.forEach((button) => {
      const menuId = button.getAttribute("aria-controls");
      const menu = menuId ? document.getElementById(menuId) : null;

      if (!menu) {
        return;
      }

      button.addEventListener("click", (event) => {
        event.stopPropagation();

        const isExpanded = button.getAttribute("aria-expanded") === "true";
        closeAllDropdowns(button);

        button.setAttribute("aria-expanded", String(!isExpanded));
        menu.hidden = isExpanded;
      });

      menu.addEventListener("click", (event) => {
        if (event.target.closest("a")) {
          closeDropdown(button);
        }
      });
    });

    document.addEventListener("click", () => {
      closeAllDropdowns();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeAllDropdowns();
      }
    });
  }

  function normalizeText(value) {
    return String(value || "")
      .trim()
      .toLowerCase();
  }

  function initBlogFilters() {
    const postList = document.querySelector("[data-post-list]");
    const posts = Array.from(document.querySelectorAll("[data-post]"));
    const searchInput = document.querySelector("[data-post-search]");
    const searchForm = document.querySelector("[data-search-form]");
    const status = document.querySelector("[data-search-status]");
    const emptyState = document.querySelector("[data-empty-state]");
    const filterButtons = Array.from(document.querySelectorAll("[data-filter]"));

    if (!postList || posts.length === 0) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    let activeCategory = normalizeText(params.get("category")) || "all";
    let activeQuery = normalizeText(params.get("q"));

    if (searchInput && activeQuery) {
      searchInput.value = activeQuery;
    }

    function postMatches(post) {
      const categories = normalizeText(post.dataset.categories);
      const title = normalizeText(post.dataset.title);
      const excerpt = normalizeText(post.dataset.excerpt);
      const combinedText = `${title} ${excerpt} ${categories} ${normalizeText(post.textContent)}`;

      const matchesCategory = activeCategory === "all" || categories.split(/\s+/).includes(activeCategory);
      const matchesQuery = !activeQuery || combinedText.includes(activeQuery);

      return matchesCategory && matchesQuery;
    }

    function updateUrl() {
      const nextParams = new URLSearchParams();

      if (activeCategory && activeCategory !== "all") {
        nextParams.set("category", activeCategory);
      }

      if (activeQuery) {
        nextParams.set("q", activeQuery);
      }

      const queryString = nextParams.toString();
      const nextUrl = queryString
        ? `${window.location.pathname}?${queryString}`
        : window.location.pathname;

      window.history.replaceState({}, "", nextUrl);
    }

    function updateButtons() {
      filterButtons.forEach((button) => {
        const isActive = normalizeText(button.dataset.filter) === activeCategory;
        button.classList.toggle("is-active", isActive);
        button.setAttribute("aria-pressed", String(isActive));
      });
    }

    function updateStatus(visibleCount) {
      if (!status) {
        return;
      }

      const categoryLabel = activeCategory === "all" ? "all categories" : activeCategory;
      const plural = visibleCount === 1 ? "post" : "posts";

      if (activeQuery) {
        status.textContent = `Showing ${visibleCount} ${plural} for “${activeQuery}” in ${categoryLabel}.`;
      } else {
        status.textContent = `Showing ${visibleCount} ${plural} in ${categoryLabel}.`;
      }
    }

    function applyFilters() {
      let visibleCount = 0;

      posts.forEach((post) => {
        const isVisible = postMatches(post);
        post.classList.toggle("hide", !isVisible);

        if (isVisible) {
          visibleCount += 1;
        }
      });

      if (emptyState) {
        emptyState.classList.toggle("is-visible", visibleCount === 0);
      }

      updateButtons();
      updateStatus(visibleCount);
      updateUrl();
    }

    filterButtons.forEach((button) => {
      button.addEventListener("click", () => {
        activeCategory = normalizeText(button.dataset.filter) || "all";
        applyFilters();
      });
    });

    if (searchInput) {
      searchInput.addEventListener("input", () => {
        activeQuery = normalizeText(searchInput.value);
        applyFilters();
      });
    }

    if (searchForm) {
      searchForm.addEventListener("submit", (event) => {
        event.preventDefault();
        activeQuery = normalizeText(searchInput ? searchInput.value : "");
        applyFilters();
      });
    }

    const allowedCategories = ["all", "technology", "productivity", "lifestyle", "opinion"];
    if (!allowedCategories.includes(activeCategory)) {
      activeCategory = "all";
    }

    applyFilters();
  }

  function initNewsletterForms() {
    document.querySelectorAll("[data-newsletter-form]").forEach((form) => {
      form.addEventListener("submit", (event) => {
        event.preventDefault();

        const emailInput = form.querySelector('input[type="email"]');
        const status = form.querySelector(".form-status");

        if (!emailInput || !status) {
          return;
        }

        if (!emailInput.checkValidity()) {
          status.textContent = "Please enter a valid email address.";
          status.classList.remove("is-success");
          status.classList.add("is-error");
          emailInput.focus();
          return;
        }

        status.textContent = "Thank you — you are on the quiet list.";
        status.classList.remove("is-error");
        status.classList.add("is-success");
        form.reset();
      });
    });
  }

  function initContactForms() {
    document.querySelectorAll("[data-contact-form]").forEach((form) => {
      form.addEventListener("submit", (event) => {
        event.preventDefault();

        const status = form.querySelector(".form-status");

        if (!form.checkValidity()) {
          if (status) {
            status.textContent = "Please complete the required fields before sending.";
            status.classList.remove("is-success");
            status.classList.add("is-error");
          }

          const firstInvalid = form.querySelector(":invalid");
          if (firstInvalid) {
            firstInvalid.focus();
          }

          return;
        }

        if (status) {
          status.textContent = "Message noted — thanks for writing. This demo form does not send email, but your note has been received on this page.";
          status.classList.remove("is-error");
          status.classList.add("is-success");
        }

        form.reset();
      });
    });
  }

  function getShareUrl(button) {
    const article = button.closest("article, section, main");
    const id = article && article.id ? `#${article.id}` : "";
    return `${window.location.origin}${window.location.pathname}${id}`;
  }

  function initSharing() {
    document.querySelectorAll("[data-share]").forEach((button) => {
      button.addEventListener("click", async () => {
        const type = normalizeText(button.dataset.share);
        const url = getShareUrl(button);
        const title = document.title;

        if (type === "x") {
          const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`;
          window.open(shareUrl, "_blank", "noopener,noreferrer");
          return;
        }

        if (type === "linkedin") {
          const shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
          window.open(shareUrl, "_blank", "noopener,noreferrer");
          return;
        }

        if (type === "copy") {
          try {
            await navigator.clipboard.writeText(url);
            const originalText = button.textContent;
            button.textContent = "Copied";
            window.setTimeout(() => {
              button.textContent = originalText;
            }, 1800);
          } catch (error) {
            window.prompt("Copy this link:", url);
          }
        }
      });
    });
  }

  function initCurrentYear() {
    document.querySelectorAll("[data-current-year]").forEach((element) => {
      element.textContent = String(new Date().getFullYear());
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    initMobileNav();
    initDropdowns();
    initBlogFilters();
    initNewsletterForms();
    initContactForms();
    initSharing();
    initCurrentYear();
  });
})();
