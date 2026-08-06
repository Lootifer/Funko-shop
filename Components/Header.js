const icon = (name) => {
  const icons = {
    heart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 1 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/></svg>',
    bag: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 8h12l1 13H5L6 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>',
    user: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4.8 21a7.2 7.2 0 0 1 14.4 0"/></svg>',
  };
  return icons[name] || "";
};

const copy = {
  nl: {
    start: "Start",
    shop: "Winkel",
    collections: "Collecties",
    about: "Over ons",
    contact: "Contact",
    account: "Account",
    wishlist: "Verlanglijst",
    cart: "Winkelwagen",
  },
  en: {
    start: "Home",
    shop: "Shop",
    collections: "Collections",
    about: "About",
    contact: "Contact",
    account: "Account",
    wishlist: "Wishlist",
    cart: "Cart",
  },
};

const PREFERENCE_VERSION = "v13-english-light";

const ensureDefaultPreferences = () => {
  if (typeof window === "undefined") return;
  if (window.localStorage.getItem("lootifer-preference-version") === PREFERENCE_VERSION) return;

  // V13 starts in English and light mode once. Afterwards the visitor's own choice is remembered.
  window.localStorage.setItem("lootifer-language", "en");
  window.localStorage.setItem("lootifer-theme", "light");
  window.localStorage.setItem("lootifer-preference-version", PREFERENCE_VERSION);
};

const getStoredTheme = () => {
  if (typeof window === "undefined") return "light";
  return window.localStorage.getItem("lootifer-theme") === "dark" ? "dark" : "light";
};

const getStoredLanguage = () => {
  if (typeof window === "undefined") return "en";
  return window.localStorage.getItem("lootifer-language") === "nl" ? "nl" : "en";
};

const applyTheme = (theme) => {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = theme;
  document.body?.setAttribute("data-theme", theme);
};

const updateHeaderLanguage = (language) => {
  const dictionary = copy[language] || copy.nl;
  document.querySelectorAll("[data-header-copy]").forEach((element) => {
    const key = element.dataset.headerCopy;
    if (dictionary[key]) element.textContent = dictionary[key];
  });
  document.querySelectorAll("[data-language-option]").forEach((button) => {
    const active = button.dataset.languageOption === language;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
};

const updateThemeControl = (theme) => {
  const toggle = document.getElementById("themeModeToggle");
  if (!toggle) return;
  const isLight = theme === "light";
  toggle.classList.toggle("is-light", isLight);
  toggle.setAttribute("aria-pressed", String(isLight));
  toggle.setAttribute(
    "aria-label",
    isLight ? "Schakel naar The dark side" : "Schakel naar Become a Jedi"
  );
};

export const initHeaderPreferences = () => {
  if (typeof document === "undefined") return;

  ensureDefaultPreferences();
  const theme = getStoredTheme();
  const language = getStoredLanguage();
  applyTheme(theme);
  updateThemeControl(theme);
  updateHeaderLanguage(language);

  const themeToggle = document.getElementById("themeModeToggle");
  if (themeToggle && themeToggle.dataset.bound !== "true") {
    themeToggle.dataset.bound = "true";
    themeToggle.addEventListener("click", () => {
      const nextTheme = document.documentElement.dataset.theme === "light" ? "dark" : "light";
      window.localStorage.setItem("lootifer-theme", nextTheme);
      applyTheme(nextTheme);
      updateThemeControl(nextTheme);
      window.dispatchEvent(new CustomEvent("lootifer:theme-change", { detail: { theme: nextTheme } }));
    });
  }

  document.querySelectorAll("[data-language-option]").forEach((button) => {
    if (button.dataset.bound === "true") return;
    button.dataset.bound = "true";
    button.addEventListener("click", () => {
      const nextLanguage = button.dataset.languageOption === "en" ? "en" : "nl";
      window.localStorage.setItem("lootifer-language", nextLanguage);
      updateHeaderLanguage(nextLanguage);
      window.dispatchEvent(
        new CustomEvent("lootifer:language-change", { detail: { language: nextLanguage } })
      );
    });
  });
};

if (typeof document !== "undefined") {
  ensureDefaultPreferences();
  applyTheme(getStoredTheme());
}

export const createHeader = (active = "home") => {
  if (typeof queueMicrotask === "function") queueMicrotask(initHeaderPreferences);

  return `
    <header class="topbar premium-topbar">
      <a class="brand" href="index.html" aria-label="Lootifer startpagina">
        <span class="brand-mark brand-mark-angular" aria-hidden="true">
          <svg viewBox="0 0 48 48">
            <path d="M11 8v30h27" />
            <path d="M18 8v21L38 9" />
            <path d="M18 29h12" />
          </svg>
        </span>
        <span class="brand-wordmark">
          <strong>Lootifer</strong>
          <small>Collectibles</small>
        </span>
      </a>

      <nav class="nav-links" aria-label="Hoofdnavigatie">
        <a href="index.html" class="${active === "home" ? "active" : ""}" data-header-copy="start">Start</a>
        <a href="shop.html" class="${active === "shop" ? "active" : ""}" data-header-copy="shop">Winkel</a>
        <a href="index.html#categories" data-header-copy="collections">Collecties</a>
        <a href="about.html" class="${active === "about" ? "active" : ""}" data-header-copy="about">Over ons</a>
        <a href="contact.html" class="${active === "contact" ? "active" : ""}" data-header-copy="contact">Contact</a>
      </nav>

      <div class="header-tools">
        <div class="language-switch" aria-label="Taal kiezen">
          <button type="button" data-language-option="nl" aria-pressed="true">NL</button>
          <button type="button" data-language-option="en" aria-pressed="false">EN</button>
        </div>

        <button class="force-theme-switch" id="themeModeToggle" type="button" aria-pressed="false">
          <span class="theme-side theme-side-dark">The dark side</span>
          <span class="theme-toggle-track" aria-hidden="true"><span class="theme-toggle-knob"></span></span>
          <span class="theme-side theme-side-light">Become a Jedi</span>
        </button>

        <a class="account-link" href="account.html" aria-label="Account inloggen">
          ${icon("user")}
          <span data-header-copy="account">Account</span>
        </a>

        <a class="header-icon-link ${active === "wishlist" ? "active" : ""}" href="wishlist.html" aria-label="Verlanglijst" data-header-aria="wishlist">
          ${icon("heart")}
          <span class="header-counter" data-header-wishlist-count>0</span>
        </a>
        <a class="header-icon-link ${active === "cart" || active === "checkout" ? "active" : ""}" href="cart.html" aria-label="Winkelwagen" data-header-aria="cart">
          ${icon("bag")}
          <span class="header-counter" data-header-cart-count>0</span>
        </a>
      </div>
    </header>
  `;
};
