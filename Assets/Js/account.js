import { createHeader } from "../../Components/Header.js";
import { createFooter } from "../../Components/Footer.js";
import { createShoppingUi } from "../../Components/Experience/shopping-ui.js";

const RAILWAY_API = "https://funko-shop-production-9308.up.railway.app/api";

const isLocal = ["localhost", "127.0.0.1"].includes(
  window.location.hostname
);

const API_BASE = window.LOOTIFER_API_BASE
  ? String(window.LOOTIFER_API_BASE).replace(/\/$/, "")
  : isLocal
    ? "http://localhost:3001/api"
    : RAILWAY_API;

const TOKEN_KEY = "second-life-account-token";
const USER_KEY = "second-life-account-user";

const headerRoot = document.getElementById("headerRoot");
const footerRoot = document.getElementById("footerRoot");

if (headerRoot) {
  headerRoot.innerHTML = createHeader("account");
}

if (footerRoot) {
  footerRoot.innerHTML = createFooter();
}

const shoppingRoot = document.createElement("div");
shoppingRoot.id = "shoppingRoot";
document.body.appendChild(shoppingRoot);

createShoppingUi({
  root: shoppingRoot,
});

const getToken = () => {
  return (
    window.sessionStorage.getItem(TOKEN_KEY) ||
    window.localStorage.getItem(TOKEN_KEY) ||
    ""
  );
};

const getStoredUser = () => {
  const source =
    window.sessionStorage.getItem(USER_KEY) ||
    window.localStorage.getItem(USER_KEY) ||
    "";

  try {
    return source ? JSON.parse(source) : null;
  } catch {
    return null;
  }
};

const storeSession = ({ token, user }, remember = false) => {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);

  window.sessionStorage.removeItem(TOKEN_KEY);
  window.sessionStorage.removeItem(USER_KEY);

  const storage = remember
    ? window.localStorage
    : window.sessionStorage;

  storage.setItem(TOKEN_KEY, token);
  storage.setItem(USER_KEY, JSON.stringify(user));

  window.dispatchEvent(
    new CustomEvent("secondlife:account-state", {
      detail: {
        authenticated: true,
        user,
      },
    })
  );
};

const updateStoredUser = (user) => {
  const storage = window.localStorage.getItem(TOKEN_KEY)
    ? window.localStorage
    : window.sessionStorage;

  storage.setItem(USER_KEY, JSON.stringify(user));

  window.dispatchEvent(
    new CustomEvent("secondlife:account-state", {
      detail: {
        authenticated: true,
        user,
      },
    })
  );
};

const clearSession = () => {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);

  window.sessionStorage.removeItem(TOKEN_KEY);
  window.sessionStorage.removeItem(USER_KEY);

  window.dispatchEvent(
    new CustomEvent("secondlife:account-state", {
      detail: {
        authenticated: false,
      },
    })
  );
};

const api = async (path, options = {}) => {
  const token = getToken();

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;

  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      credentials: "include",
      cache: "no-store",
    });
  } catch {
    throw new Error(
      "De server is niet bereikbaar. Probeer het later opnieuw."
    );
  }

  let body = {};

  try {
    body = await response.json();
  } catch {
    body = {};
  }

  if (!response.ok) {
    const details = Array.isArray(body?.details)
      ? ` ${body.details.join(" ")}`
      : "";

    throw new Error(
      `${body?.error || `API ${response.status}`}${details}`.trim()
    );
  }

  return body;
};

const setStatus = (form, message, type = "") => {
  const status = form?.querySelector(".account-form-status");

  if (!status) {
    return;
  }

  status.hidden = !message;
  status.textContent = message || "";

  status.classList.toggle("is-error", type === "error");
  status.classList.toggle("is-success", type === "success");
};

const setBusy = (form, busy) => {
  const button = form?.querySelector('button[type="submit"]');

  if (!button) {
    return;
  }

  if (!button.dataset.originalText) {
    button.dataset.originalText = button.textContent;
  }

  button.disabled = busy;
  button.textContent = busy
    ? "Even geduld…"
    : button.dataset.originalText;
};

const guestIntro = document.querySelector(
  "[data-account-guest-intro]"
);

const guestArea = document.querySelector(
  "[data-account-guest]"
);

const dashboard = document.querySelector(
  "[data-account-dashboard]"
);

const profileForm = document.querySelector(
  '[data-account-form="profile"]'
);

const ordersRoot = document.querySelector(
  "[data-account-orders]"
);

const resetArea = document.querySelector(
  "[data-account-reset]"
);

const resetForm = document.querySelector(
  '[data-account-form="reset"]'
);

const formatMoney = (value) => {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(Number(value) || 0);
};

const formatDate = (value) => {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? ""
    : new Intl.DateTimeFormat("nl-NL", {
        dateStyle: "medium",
      }).format(date);
};

const renderOrders = (orders = []) => {
  if (!ordersRoot) {
    return;
  }

  if (!orders.length) {
    ordersRoot.innerHTML = `
      <div class="account-empty">
        Er zijn nog geen bestellingen gevonden voor dit e-mailadres.
      </div>
    `;

    return;
  }

  ordersRoot.innerHTML = orders
    .map(
      (order) => `
        <article class="account-order">
          <div class="account-order-top">
            <div>
              <div class="account-order-number">
                ${String(order.number || "Bestelling")}
              </div>

              <div class="account-order-meta">
                ${formatDate(order.createdAt)}
                ·
                ${String(order.status || "Nieuw")}
              </div>
            </div>

            <div class="account-order-total">
              ${formatMoney(order.total)}
            </div>
          </div>

          <ul class="account-order-items">
            ${(order.items || [])
              .map(
                (item) => `
                  <li>
                    ${Number(item.quantity) || 0}×
                    ${String(item.name || "Product")}
                  </li>
                `
              )
              .join("")}
          </ul>
        </article>
      `
    )
    .join("");
};

const fillDashboard = async (user) => {
  if (!user) {
    return;
  }

  if (guestIntro) {
    guestIntro.hidden = true;
  }

  if (guestArea) {
    guestArea.hidden = true;
  }

  if (resetArea) {
    resetArea.hidden = true;
  }

  if (dashboard) {
    dashboard.hidden = false;
  }

  document
    .querySelectorAll("[data-account-first-name]")
    .forEach((element) => {
      element.textContent = user.firstName || "collector";
    });

  document
    .querySelectorAll("[data-account-email]")
    .forEach((element) => {
      element.textContent = user.email || "";
    });

  if (profileForm) {
    [
      "firstName",
      "lastName",
      "email",
      "phone",
      "street",
      "houseNumber",
      "postalCode",
      "city",
      "country",
    ].forEach((name) => {
      const input = profileForm.elements.namedItem(name);

      if (input) {
        input.value =
          user[name] ||
          (name === "country" ? "Nederland" : "");
      }
    });
  }

  try {
    const payload = await api("/account/orders", {
      method: "GET",
    });

    renderOrders(payload.orders || []);
  } catch (error) {
    if (ordersRoot) {
      ordersRoot.innerHTML = `
        <div class="account-empty">
          ${error.message}
        </div>
      `;
    }
  }
};

const showGuest = () => {
  if (guestIntro) {
    guestIntro.hidden = false;
  }

  if (guestArea) {
    guestArea.hidden = false;
  }

  if (dashboard) {
    dashboard.hidden = true;
  }

  if (resetArea) {
    resetArea.hidden = true;
  }
};

const restoreSession = async () => {
  if (!getToken()) {
    showGuest();
    return;
  }

  const cached = getStoredUser();

  if (cached) {
    fillDashboard(cached);
  }

  try {
    const payload = await api("/account/me", {
      method: "GET",
    });

    updateStoredUser(payload.user);

    await fillDashboard(payload.user);
  } catch {
    clearSession();
    showGuest();
  }
};

/* --------------------------------------------------
   INLOGGEN EN REGISTREREN
-------------------------------------------------- */

document
  .querySelectorAll(
    '[data-account-form="login"], [data-account-form="register"]'
  )
  .forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      if (!form.checkValidity()) {
        return form.reportValidity();
      }

      const mode = form.dataset.accountForm;

      const values = Object.fromEntries(
        new FormData(form).entries()
      );

      const remember = Boolean(
        form.elements.namedItem("remember")?.checked
      );

      if (mode === "register") {
        if (
          values.password !==
          values.passwordRepeat
        ) {
          setStatus(
            form,
            "De twee wachtwoorden zijn niet gelijk.",
            "error"
          );

          return;
        }

        values.termsAccepted = Boolean(
          form.elements.namedItem("termsAccepted")?.checked
        );
      }

      setBusy(form, true);
      setStatus(form, "");

      try {
        const payload = await api(`/account/${mode}`, {
          method: "POST",
          body: JSON.stringify({
            ...values,
            remember,
          }),
        });

        storeSession(payload, remember);

        form.reset();

        await fillDashboard(payload.user);

        window.history.replaceState(
          null,
          "",
          "account.html"
        );

        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });
      } catch (error) {
        setStatus(
          form,
          error.message,
          "error"
        );
      } finally {
        setBusy(form, false);
      }
    });
  });

/* --------------------------------------------------
   PROFIEL OPSLAAN
-------------------------------------------------- */

profileForm?.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    if (!profileForm.checkValidity()) {
      return profileForm.reportValidity();
    }

    setBusy(profileForm, true);
    setStatus(profileForm, "");

    try {
      const values = Object.fromEntries(
        new FormData(profileForm).entries()
      );

      const payload = await api(
        "/account/profile",
        {
          method: "PATCH",
          body: JSON.stringify(values),
        }
      );

      updateStoredUser(payload.user);

      setStatus(
        profileForm,
        "Je gegevens zijn opgeslagen.",
        "success"
      );

      await fillDashboard(payload.user);
    } catch (error) {
      setStatus(
        profileForm,
        error.message,
        "error"
      );
    } finally {
      setBusy(profileForm, false);
    }
  }
);

/* --------------------------------------------------
   WACHTWOORD WIJZIGEN BINNEN ACCOUNT
-------------------------------------------------- */

const passwordForm = document.querySelector(
  '[data-account-form="password"]'
);

passwordForm?.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    if (!passwordForm.checkValidity()) {
      return passwordForm.reportValidity();
    }

    const values = Object.fromEntries(
      new FormData(passwordForm).entries()
    );

    if (
      values.newPassword !==
      values.newPasswordRepeat
    ) {
      setStatus(
        passwordForm,
        "De twee nieuwe wachtwoorden zijn niet gelijk.",
        "error"
      );

      return;
    }

    setBusy(passwordForm, true);
    setStatus(passwordForm, "");

    try {
      await api("/account/change-password", {
        method: "POST",
        body: JSON.stringify(values),
      });

      passwordForm.reset();

      setStatus(
        passwordForm,
        "Je wachtwoord is gewijzigd.",
        "success"
      );
    } catch (error) {
      setStatus(
        passwordForm,
        error.message,
        "error"
      );
    } finally {
      setBusy(passwordForm, false);
    }
  }
);

/* --------------------------------------------------
   UITLOGGEN
-------------------------------------------------- */

document
  .querySelector("[data-account-logout]")
  ?.addEventListener(
    "click",
    async () => {
      try {
        await api("/account/logout", {
          method: "POST",
          body: "{}",
        });
      } catch {
        // Lokale sessie wordt alsnog verwijderd.
      }

      clearSession();
      showGuest();

      window.location.hash = "login";
    }
  );

/* --------------------------------------------------
   WACHTWOORD VERGETEN
-------------------------------------------------- */

document
  .querySelector("[data-password-reset]")
  ?.addEventListener(
    "click",
    async (event) => {
      event.preventDefault();

      const button = event.currentTarget;
      const form = button.closest("form");

      const emailInput =
        form?.elements.namedItem("email");

      const email = String(
        emailInput?.value || ""
      ).trim();

      if (!email) {
        setStatus(
          form,
          "Vul eerst je e-mailadres in.",
          "error"
        );

        emailInput?.focus();

        return;
      }

      if (!emailInput.checkValidity()) {
        emailInput.reportValidity();
        return;
      }

      button.disabled = true;

      setStatus(
        form,
        "Herstelmail wordt verstuurd…"
      );

      try {
        const payload = await api(
          "/account/forgot-password",
          {
            method: "POST",
            body: JSON.stringify({
              email,
            }),
          }
        );

        setStatus(
          form,
          payload.message ||
            "Als dit e-mailadres bij ons bekend is, ontvang je een herstel-link.",
          "success"
        );
      } catch (error) {
        setStatus(
          form,
          error.message,
          "error"
        );
      } finally {
        button.disabled = false;
      }
    }
  );

/* --------------------------------------------------
   RESETLINK UIT E-MAIL
-------------------------------------------------- */

const getResetToken = () => {
  const params = new URLSearchParams(
    window.location.search
  );

  return params.get("resetToken") || "";
};

const showResetFormIfNeeded = () => {
  const resetToken = getResetToken();

  if (!resetToken) {
    if (resetArea) {
      resetArea.hidden = true;
    }

    return false;
  }

  if (guestIntro) {
    guestIntro.hidden = true;
  }

  if (guestArea) {
    guestArea.hidden = true;
  }

  if (dashboard) {
    dashboard.hidden = true;
  }

  if (resetArea) {
    resetArea.hidden = false;
  }

  requestAnimationFrame(() => {
    resetArea?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  });

  return true;
};

/* --------------------------------------------------
   NIEUW WACHTWOORD OPSLAAN
-------------------------------------------------- */

resetForm?.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    if (!resetForm.checkValidity()) {
      return resetForm.reportValidity();
    }

    const values = Object.fromEntries(
      new FormData(resetForm).entries()
    );

    const resetToken = getResetToken();

    if (!resetToken) {
      setStatus(
        resetForm,
        "Deze herstel-link is ongeldig.",
        "error"
      );

      return;
    }

    if (
      values.newPassword !==
      values.newPasswordRepeat
    ) {
      setStatus(
        resetForm,
        "De twee wachtwoorden zijn niet gelijk.",
        "error"
      );

      return;
    }

    setBusy(resetForm, true);
    setStatus(resetForm, "");

    try {
      const payload = await api(
        "/account/reset-password",
        {
          method: "POST",
          body: JSON.stringify({
            token: resetToken,
            newPassword:
              values.newPassword,
          }),
        }
      );

      resetForm.reset();

      setStatus(
        resetForm,
        payload.message ||
          "Je wachtwoord is gewijzigd. Je kunt nu inloggen.",
        "success"
      );

      window.setTimeout(() => {
        window.location.href =
          "account.html#login";
      }, 1800);
    } catch (error) {
      setStatus(
        resetForm,
        error.message,
        "error"
      );
    } finally {
      setBusy(resetForm, false);
    }
  }
);

/* --------------------------------------------------
   HASH NAVIGATIE
-------------------------------------------------- */

const focusHashSection = () => {
  const hash = window.location.hash;

  if (
    hash === "#logout" &&
    getToken()
  ) {
    document
      .querySelector("[data-account-logout]")
      ?.click();

    return;
  }

  if (
    !["#login", "#register"].includes(hash) ||
    getToken()
  ) {
    return;
  }

  const section =
    document.querySelector(hash);

  if (!section) {
    return;
  }

  requestAnimationFrame(() => {
    section.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });

    section.classList.add(
      "is-targeted"
    );

    window.setTimeout(() => {
      section.classList.remove(
        "is-targeted"
      );
    }, 1600);
  });
};

window.addEventListener(
  "hashchange",
  focusHashSection
);

const hasResetToken =
  showResetFormIfNeeded();

if (!hasResetToken) {
  restoreSession().finally(() => {
    focusHashSection();
  });
}