import {
  fetchAdminAuthStatus,
  loginAdmin,
  logoutAdmin,
  SERVER_UNREACHABLE_MESSAGE,
} from "../../Assets/Js/api-client.js";

const LOGIN_PAGE = new URL("../login.html", import.meta.url).href;
const DASHBOARD_PAGE = new URL("../dashboard.html", import.meta.url).href;

const getSafeReturnUrl = () => {
  const candidate = new URLSearchParams(window.location.search).get("return");
  if (!candidate) return DASHBOARD_PAGE;
  try {
    const url = new URL(candidate, window.location.href);
    const isSameOrigin = url.origin === window.location.origin;
    const isAdminPage = url.pathname.includes("/admin/");
    return isSameOrigin && isAdminPage ? url.href : DASHBOARD_PAGE;
  } catch {
    return DASHBOARD_PAGE;
  }
};

const redirectToLogin = (reason = "") => {
  const url = new URL(LOGIN_PAGE);
  const current = window.location.href;
  if (!current.includes("login.html")) url.searchParams.set("return", current);
  if (reason) url.searchParams.set("reason", reason);
  window.location.replace(url.href);
};

export const requireAdminSession = async () => {
  try {
    const status = await fetchAdminAuthStatus();
    if (!status?.configured) {
      redirectToLogin("setup");
      return null;
    }
    if (!status?.authenticated) {
      redirectToLogin("login");
      return null;
    }
    return status.user || null;
  } catch {
    document.body.innerHTML = `<main class="admin-auth-unavailable"><div class="admin-login-card"><h1>Server niet bereikbaar</h1><p>${SERVER_UNREACHABLE_MESSAGE}</p></div></main>`;
    return null;
  }
};

export const wireAdminTopbar = (user = null) => {
  const label = document.querySelector("[data-admin-user]");
  if (label) label.textContent = user?.username || "Beheerder";
  document.querySelector("[data-admin-logout]")?.addEventListener("click", async () => {
    try {
      await logoutAdmin();
    } finally {
      redirectToLogin("logout");
    }
  });
};

export const initializeLoginPage = async () => {
  const form = document.getElementById("adminLoginForm");
  const statusNode = document.getElementById("adminLoginStatus");
  const setupNode = document.getElementById("adminSetupNotice");
  const submit = document.getElementById("adminLoginButton");

  const setStatus = (message, tone = "muted") => {
    if (!statusNode) return;
    statusNode.textContent = message;
    statusNode.dataset.tone = tone;
  };

  let authStatus;
  try {
    authStatus = await fetchAdminAuthStatus();
  } catch {
    setStatus(SERVER_UNREACHABLE_MESSAGE, "error");
    if (submit) submit.disabled = true;
    return;
  }

  if (authStatus?.authenticated) {
    window.location.replace(getSafeReturnUrl());
    return;
  }

  if (!authStatus?.configured) {
    if (setupNode) setupNode.hidden = false;
    if (submit) submit.disabled = true;
    setStatus("Stel eerst een beheerder in via de terminal.", "error");
    return;
  }

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const username = String(data.get("username") || "").trim();
    const password = String(data.get("password") || "");
    if (!username || !password) {
      setStatus("Vul gebruikersnaam en wachtwoord in.", "error");
      return;
    }

    submit.disabled = true;
    setStatus("Bezig met inloggen…", "muted");
    try {
      await loginAdmin(username, password);
      window.location.replace(getSafeReturnUrl());
    } catch (error) {
      setStatus(error.message || "Inloggen is mislukt.", "error");
      submit.disabled = false;
    }
  });
};
