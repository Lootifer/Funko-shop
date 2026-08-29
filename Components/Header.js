const icon = (name) => {
  const icons = {
    heart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 1 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/></svg>',
    bag: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 8h12l1 13H5L6 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>',
    user: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4.8 21a7.2 7.2 0 0 1 14.4 0"/></svg>',
    search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.2 4.2"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>',
    plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14"/><path d="M5 12h14"/></svg>',
  };

  return icons[name] || "";
};

const copy = {
  nl: {
    home: "Home",
    shop: "Winkel",
    contact: "Contact",
    account: "Account",
    accountTitle: "Mijn account",
    accountQuestion: "Wat wil je doen?",
    login: "Inloggen",
    loginHint: "Ik heb al een account",
    createAccount: "Maak account",
    createHint: "Ik ben nieuw bij 2nd Life Toys",
    myAccount: "Mijn account",
    myAccountHint: "Bekijk gegevens en bestellingen",
    logout: "Uitloggen",
    logoutHint: "Afmelden op dit apparaat",
    wishlist: "Verlanglijst",
    cart: "Winkelwagen",
    searchPlaceholder: "Zoek product...",
    searchLabel: "Zoeken in alle producten",
  },
  en: {
    home: "Home",
    shop: "Shop",
    contact: "Contact",
    account: "Account",
    accountTitle: "My account",
    accountQuestion: "What would you like to do?",
    login: "Sign in",
    loginHint: "I already have an account",
    createAccount: "Create account",
    createHint: "I am new to 2nd Life Toys",
    myAccount: "My account",
    myAccountHint: "View details and orders",
    logout: "Sign out",
    logoutHint: "Sign out on this device",
    wishlist: "Wishlist",
    cart: "Cart",
    searchPlaceholder: "Search product...",
    searchLabel: "Search all products",
  },
};

const getLanguage = () => {
  if (typeof window === "undefined") return "nl";
  return window.localStorage.getItem("lootifer-language") === "en" ? "en" : "nl";
};

const applyDarkTheme = () => {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = "dark";
  document.body?.setAttribute("data-theme", "dark");
};

const ensureHeaderStyles = () => {
  if (typeof document === "undefined") return;
  if (document.getElementById("second-life-header-v46-styles")) return;

  const style = document.createElement("style");
  style.id = "second-life-header-v46-styles";
  style.textContent = `
    .second-life-account-menu {
      position: relative !important;
      z-index: 10000 !important;
    }

    .second-life-account-menu > summary {
      list-style: none !important;
    }

    .second-life-account-menu > summary::-webkit-details-marker {
      display: none !important;
    }

    .second-life-account-summary {
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 8px !important;
      min-height: 46px !important;
      padding: 0 14px !important;
      border: 1px solid rgba(255,255,255,.12) !important;
      border-radius: 13px !important;
      background: rgba(255,255,255,.025) !important;
      color: #fff !important;
      cursor: pointer !important;
      font: inherit !important;
      font-size: 14px !important;
      font-weight: 700 !important;
      white-space: nowrap !important;
      transition: border-color .18s ease, background .18s ease, box-shadow .18s ease !important;
    }

    .second-life-account-summary:hover,
    .second-life-account-menu[open] > .second-life-account-summary {
      border-color: rgba(238,194,54,.65) !important;
      background: rgba(238,194,54,.06) !important;
      box-shadow: 0 0 0 2px rgba(238,194,54,.07) !important;
    }

    .second-life-account-summary svg {
      width: 18px !important;
      height: 18px !important;
      fill: none !important;
      stroke: currentColor !important;
      stroke-width: 1.8 !important;
    }

    .second-life-account-chevron {
      display: inline-block !important;
      margin-left: 1px !important;
      font-size: 11px !important;
      opacity: .72 !important;
      transform: rotate(0deg) !important;
      transition: transform .18s ease !important;
    }

    .second-life-account-menu[open] .second-life-account-chevron {
      transform: rotate(180deg) !important;
    }

    .second-life-account-panel {
      position: absolute !important;
      top: calc(100% + 12px) !important;
      right: 0 !important;
      display: block !important;
      width: 340px !important;
      max-width: calc(100vw - 24px) !important;
      padding: 13px !important;
      margin: 0 !important;
      border: 1px solid rgba(238,194,54,.30) !important;
      border-radius: 18px !important;
      background:
        radial-gradient(circle at 92% 0%, rgba(238,194,54,.12), transparent 38%),
        linear-gradient(145deg, #171b20, #090c0f) !important;
      box-shadow: 0 30px 80px rgba(0,0,0,.68) !important;
      color: #fff !important;
      text-align: left !important;
      overflow: visible !important;
      z-index: 999999 !important;
    }

    .second-life-account-panel::before {
      content: "" !important;
      position: absolute !important;
      top: -7px !important;
      right: 36px !important;
      width: 13px !important;
      height: 13px !important;
      transform: rotate(45deg) !important;
      background: #15191e !important;
      border-left: 1px solid rgba(238,194,54,.30) !important;
      border-top: 1px solid rgba(238,194,54,.30) !important;
    }

    .second-life-account-panel-head {
      display: flex !important;
      align-items: center !important;
      gap: 11px !important;
      padding: 7px 7px 13px !important;
      border-bottom: 1px solid rgba(255,255,255,.09) !important;
    }

    .second-life-account-panel-icon {
      display: grid !important;
      place-items: center !important;
      flex: 0 0 40px !important;
      width: 40px !important;
      height: 40px !important;
      border: 1px solid rgba(238,194,54,.22) !important;
      border-radius: 12px !important;
      background: rgba(238,194,54,.10) !important;
      color: #f0c63f !important;
    }

    .second-life-account-panel-icon svg {
      width: 19px !important;
      height: 19px !important;
      fill: none !important;
      stroke: currentColor !important;
      stroke-width: 1.8 !important;
    }

    .second-life-account-panel-title {
      display: block !important;
      margin: 0 !important;
      color: #fff !important;
      font-size: 16px !important;
      font-weight: 800 !important;
      line-height: 1.15 !important;
    }

    .second-life-account-panel-subtitle {
      display: block !important;
      margin-top: 3px !important;
      color: #9298a0 !important;
      font-size: 12px !important;
      font-weight: 500 !important;
      line-height: 1.3 !important;
    }

    .second-life-account-actions {
      display: grid !important;
      gap: 9px !important;
      padding-top: 11px !important;
    }

    .second-life-account-action {
      display: grid !important;
      grid-template-columns: 38px minmax(0,1fr) !important;
      align-items: center !important;
      gap: 11px !important;
      width: 100% !important;
      min-height: 66px !important;
      padding: 11px 12px !important;
      border-radius: 13px !important;
      text-decoration: none !important;
      box-sizing: border-box !important;
      transition: transform .16s ease, border-color .16s ease, background .16s ease, box-shadow .16s ease !important;
    }

    .second-life-account-action:hover {
      transform: translateY(-2px) !important;
    }

    .second-life-account-login {
      border: 1px solid rgba(255,221,96,.75) !important;
      background: linear-gradient(135deg,#f7d151,#e6af28) !important;
      color: #0d0e10 !important;
      box-shadow: 0 9px 24px rgba(218,166,35,.18) !important;
    }

    .second-life-account-login:hover {
      box-shadow: 0 13px 30px rgba(218,166,35,.26) !important;
    }

    .second-life-account-register {
      border: 1px solid rgba(255,255,255,.12) !important;
      background: rgba(255,255,255,.045) !important;
      color: #fff !important;
    }

    .second-life-account-register:hover {
      border-color: rgba(238,194,54,.35) !important;
      background: rgba(238,194,54,.07) !important;
    }

    .second-life-account-action-icon {
      display: grid !important;
      place-items: center !important;
      width: 36px !important;
      height: 36px !important;
      border-radius: 10px !important;
      background: rgba(0,0,0,.10) !important;
    }

    .second-life-account-register .second-life-account-action-icon {
      background: rgba(238,194,54,.09) !important;
      color: #f0c63f !important;
    }

    .second-life-account-action-icon svg {
      width: 18px !important;
      height: 18px !important;
      fill: none !important;
      stroke: currentColor !important;
      stroke-width: 2 !important;
    }

    .second-life-account-action-copy {
      display: block !important;
      min-width: 0 !important;
    }

    .second-life-account-action-title {
      display: block !important;
      margin: 0 !important;
      color: inherit !important;
      font-size: 14px !important;
      font-weight: 800 !important;
      line-height: 1.25 !important;
    }

    .second-life-account-action-subtitle {
      display: block !important;
      margin-top: 3px !important;
      color: inherit !important;
      opacity: .66 !important;
      font-size: 11px !important;
      font-weight: 500 !important;
      line-height: 1.35 !important;
    }

    @media (max-width: 700px) {
      .second-life-account-panel {
        position: fixed !important;
        top: 112px !important;
        right: 12px !important;
        left: 12px !important;
        width: auto !important;
        max-width: none !important;
      }

      .second-life-account-panel::before {
        display: none !important;
      }
    }
  `;

  document.head.appendChild(style);
};

const ACCOUNT_TOKEN_KEY = "second-life-account-token";
const ACCOUNT_USER_KEY = "second-life-account-user";

const readStoredAccount = () => {
  if (typeof window === "undefined") return null;
  const token = window.sessionStorage.getItem(ACCOUNT_TOKEN_KEY) || window.localStorage.getItem(ACCOUNT_TOKEN_KEY) || "";
  const raw = window.sessionStorage.getItem(ACCOUNT_USER_KEY) || window.localStorage.getItem(ACCOUNT_USER_KEY) || "";
  if (!token || !raw) return null;
  try { return { token, user: JSON.parse(raw) }; } catch { return null; }
};

const updateAccountMenuState = (state = null) => {
  if (typeof document === "undefined") return;
  const stored = state || readStoredAccount();
  const authenticated = Boolean(stored?.user);
  const user = stored?.user || {};

  document.querySelectorAll("[data-second-life-account-menu]").forEach((menu) => {
    const summary = menu.querySelector("[data-account-summary-label]");
    const title = menu.querySelector("[data-account-panel-title]");
    const subtitle = menu.querySelector("[data-account-panel-subtitle]");
    const guestActions = menu.querySelector("[data-account-guest-actions]");
    const memberActions = menu.querySelector("[data-account-member-actions]");

    if (summary) summary.textContent = authenticated ? (user.firstName || "Account") : (copy[getLanguage()]?.account || "Account");
    if (title) title.textContent = authenticated ? `Hallo, ${user.firstName || "collector"}` : (copy[getLanguage()]?.accountTitle || "Mijn account");
    if (subtitle) subtitle.textContent = authenticated ? (user.email || "") : (copy[getLanguage()]?.accountQuestion || "Wat wil je doen?");
    if (guestActions) guestActions.hidden = authenticated;
    if (memberActions) memberActions.hidden = !authenticated;
  });
};

const updateHeaderLanguage = (language = getLanguage()) => {
  if (typeof document === "undefined") return;

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

  document.querySelectorAll("[data-header-search-input]").forEach((input) => {
    input.placeholder = dictionary.searchPlaceholder;
    input.setAttribute("aria-label", dictionary.searchLabel);
  });

  document.querySelectorAll("[data-header-search-submit]").forEach((button) => {
    button.setAttribute("aria-label", dictionary.searchLabel);
    button.setAttribute("title", dictionary.searchLabel);
  });
};

const bindHeaderSearch = () => {
  document.querySelectorAll("[data-header-search-form]").forEach((form) => {
    if (form.dataset.bound === "true") return;
    form.dataset.bound = "true";

    const input = form.querySelector("[data-header-search-input]");

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const query = String(input?.value || "").trim();

      window.location.href = query
        ? `all-products.html?search=${encodeURIComponent(query)}`
        : "all-products.html";
    });
  });
};

const bindLanguageSwitch = () => {
  document.querySelectorAll("[data-language-option]").forEach((button) => {
    if (button.dataset.bound === "true") return;
    button.dataset.bound = "true";

    button.addEventListener("click", () => {
      const language = button.dataset.languageOption === "en" ? "en" : "nl";
      window.localStorage.setItem("lootifer-language", language);
      updateHeaderLanguage(language);

      window.dispatchEvent(
        new CustomEvent("lootifer:language-change", {
          detail: { language },
        })
      );
    });
  });
};

const bindAccountMenu = () => {
  const menus = Array.from(document.querySelectorAll("[data-second-life-account-menu]"));

  if (!menus.length) return;

  menus.forEach((menu) => {
    if (menu.dataset.bound === "true") return;
    menu.dataset.bound = "true";

    menu.addEventListener("toggle", () => {
      if (!menu.open) return;

      menus.forEach((otherMenu) => {
        if (otherMenu !== menu) otherMenu.removeAttribute("open");
      });
    });
  });

  if (document.documentElement.dataset.secondLifeAccountGlobalBound === "true") return;
  document.documentElement.dataset.secondLifeAccountGlobalBound = "true";

  document.addEventListener("click", (event) => {
    menus.forEach((menu) => {
      if (!menu.contains(event.target)) {
        menu.removeAttribute("open");
      }
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    menus.forEach((menu) => menu.removeAttribute("open"));
  });
};

export const initHeaderPreferences = () => {
  if (typeof document === "undefined") return;

  ensureHeaderStyles();
  applyDarkTheme();

  if (!window.localStorage.getItem("lootifer-language")) {
    window.localStorage.setItem("lootifer-language", "nl");
  }

  window.localStorage.setItem("lootifer-theme", "dark");

  updateHeaderLanguage(getLanguage());
  bindHeaderSearch();
  bindLanguageSwitch();
  bindAccountMenu();
  updateAccountMenuState();

  if (document.documentElement.dataset.secondLifeAccountStateBound !== "true") {
    document.documentElement.dataset.secondLifeAccountStateBound = "true";
    window.addEventListener("secondlife:account-state", (event) => {
      const detail = event.detail || {};
      updateAccountMenuState(detail.authenticated ? { user: detail.user } : null);
    });
  }
};

if (typeof document !== "undefined") {
  ensureHeaderStyles();
  applyDarkTheme();
}

export const createHeader = (active = "home") => {
  if (typeof queueMicrotask === "function") {
    queueMicrotask(initHeaderPreferences);
  }

  return `
    <header class="topbar premium-topbar">
      <a class="brand" href="index.html" aria-label="2nd Life Toys home">
        <img
          class="brand-logo-image"
          src="Assets/Images/Brand/2nd-life-toys-logo-v2.png"
          alt="2nd Life Toys"
        />
      </a>

      <nav class="nav-links" aria-label="Hoofdnavigatie">
        <a
          href="index.html"
          class="${active === "home" ? "active" : ""}"
          data-header-copy="home"
        >Home</a>

        <a
          href="shop.html"
          class="${active === "shop" ? "active" : ""}"
          data-header-copy="shop"
        >Winkel</a>

        <a
          href="contact.html"
          class="${active === "contact" ? "active" : ""}"
          data-header-copy="contact"
        >Contact</a>
      </nav>

      <div class="header-tools">
        <form class="header-product-search" data-header-search-form role="search">
          <input
            type="search"
            data-header-search-input
            autocomplete="off"
            placeholder="Zoek product..."
            aria-label="Zoeken in alle producten"
          />

          <button
            type="submit"
            data-header-search-submit
            aria-label="Zoeken in alle producten"
          >
            ${icon("search")}
          </button>
        </form>

        <div class="language-switch" aria-label="Taal kiezen">
          <button type="button" data-language-option="nl" aria-pressed="true">NL</button>
          <button type="button" data-language-option="en" aria-pressed="false">EN</button>
        </div>

        <details
          class="second-life-account-menu"
          data-second-life-account-menu
        >
          <summary class="second-life-account-summary">
            ${icon("user")}
            <span data-header-copy="account" data-account-summary-label>Account</span>
            <span class="second-life-account-chevron" aria-hidden="true">⌄</span>
          </summary>

          <div class="second-life-account-panel">
            <div class="second-life-account-panel-head">
              <span class="second-life-account-panel-icon" aria-hidden="true">
                ${icon("user")}
              </span>

              <span>
                <strong
                  class="second-life-account-panel-title"
                  data-header-copy="accountTitle"
                  data-account-panel-title
                >Mijn account</strong>

                <small
                  class="second-life-account-panel-subtitle"
                  data-header-copy="accountQuestion"
                  data-account-panel-subtitle
                >Wat wil je doen?</small>
              </span>
            </div>

            <div class="second-life-account-actions" data-account-guest-actions>
              <a
                class="second-life-account-action second-life-account-login"
                href="account.html#login"
              >
                <span class="second-life-account-action-icon" aria-hidden="true">
                  ${icon("arrow")}
                </span>

                <span class="second-life-account-action-copy">
                  <strong
                    class="second-life-account-action-title"
                    data-header-copy="login"
                  >Inloggen</strong>

                  <small
                    class="second-life-account-action-subtitle"
                    data-header-copy="loginHint"
                  >Ik heb al een account</small>
                </span>
              </a>

              <a
                class="second-life-account-action second-life-account-register"
                href="account.html#register"
              >
                <span class="second-life-account-action-icon" aria-hidden="true">
                  ${icon("plus")}
                </span>

                <span class="second-life-account-action-copy">
                  <strong
                    class="second-life-account-action-title"
                    data-header-copy="createAccount"
                  >Maak account</strong>

                  <small
                    class="second-life-account-action-subtitle"
                    data-header-copy="createHint"
                  >Ik ben nieuw bij 2nd Life Toys</small>
                </span>
              </a>
            </div>

            <div class="second-life-account-actions" data-account-member-actions hidden>
              <a class="second-life-account-action second-life-account-login" href="account.html">
                <span class="second-life-account-action-icon" aria-hidden="true">${icon("arrow")}</span>
                <span class="second-life-account-action-copy">
                  <strong class="second-life-account-action-title" data-header-copy="myAccount">Mijn account</strong>
                  <small class="second-life-account-action-subtitle" data-header-copy="myAccountHint">Bekijk gegevens en bestellingen</small>
                </span>
              </a>
              <a class="second-life-account-action second-life-account-register" href="account.html#logout">
                <span class="second-life-account-action-icon" aria-hidden="true">${icon("arrow")}</span>
                <span class="second-life-account-action-copy">
                  <strong class="second-life-account-action-title" data-header-copy="logout">Uitloggen</strong>
                  <small class="second-life-account-action-subtitle" data-header-copy="logoutHint">Afmelden op dit apparaat</small>
                </span>
              </a>
            </div>
          </div>
        </details>

        <a
          class="header-icon-link ${active === "wishlist" ? "active" : ""}"
          href="wishlist.html"
          aria-label="Verlanglijst"
          data-header-aria="wishlist"
        >
          ${icon("heart")}
          <span class="header-counter" data-header-wishlist-count>0</span>
        </a>

        <a
          class="header-icon-link ${active === "cart" || active === "checkout" ? "active" : ""}"
          href="cart.html"
          aria-label="Winkelwagen"
          data-header-aria="cart"
        >
          ${icon("bag")}
          <span class="header-counter" data-header-cart-count>0</span>
        </a>
      </div>
    </header>
  `;
};