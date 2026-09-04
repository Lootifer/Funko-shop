import { createAdminSidebar, createAdminTopbar } from "../components/layout.js";
import { requireAdminSession, wireAdminTopbar } from "./admin-auth.js";
import {
  fetchCustomerByIdFromApi,
  fetchCustomersFromApi,
} from "../../Assets/Js/api-client.js";

const euro = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" });

const root = {
  sidebar: document.getElementById("adminSidebar"),
  topbar: document.getElementById("adminTopbar"),
  status: document.getElementById("customersStatus"),
  overviewStats: document.getElementById("customerOverviewStats"),
  resultHint: document.getElementById("customersResultHint"),
  tableBody: document.getElementById("customersTableBody"),
  detailCard: document.getElementById("customerDetailCard"),
  search: document.getElementById("customerSearch"),
};

const state = {
  customers: [],
  selectedCustomerId: null,
};

const escapeHtml = (value = "") => String(value)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/\"/g, "&quot;")
  .replace(/'/g, "&#39;");

const dash = (value) => {
  const text = String(value ?? "").trim();
  return text ? escapeHtml(text) : "—";
};

const formatDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const setStatus = (message, tone = "muted") => {
  if (!root.status) return;
  root.status.textContent = message;
  root.status.dataset.tone = tone;
};

const isSameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const renderOverviewStats = () => {
  if (!root.overviewStats) return;

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const newToday = state.customers.filter((customer) => {
    if (!customer.createdAt) return false;
    const created = new Date(customer.createdAt);
    return !Number.isNaN(created.getTime()) && isSameDay(created, now);
  }).length;

  const newThisWeek = state.customers.filter((customer) => {
    if (!customer.createdAt) return false;
    const created = new Date(customer.createdAt);
    return !Number.isNaN(created.getTime()) && created >= weekAgo;
  }).length;

  root.overviewStats.innerHTML = `
    <article class="admin-mini-stat">
      <p class="admin-label">Totaal klanten</p>
      <strong>${state.customers.length}</strong>
    </article>
    <article class="admin-mini-stat success">
      <p class="admin-label">Nieuw vandaag</p>
      <strong>${newToday}</strong>
    </article>
    <article class="admin-mini-stat success">
      <p class="admin-label">Nieuw deze week</p>
      <strong>${newThisWeek}</strong>
    </article>
  `;
};

const getFilteredCustomers = () => {
  const query = String(root.search?.value || "").trim().toLowerCase();
  if (!query) return state.customers;

  return state.customers.filter((customer) => {
    const name = String(customer.name || "").toLowerCase();
    const email = String(customer.email || "").toLowerCase();
    const phone = String(customer.phone || "").toLowerCase();
    return name.includes(query) || email.includes(query) || phone.includes(query);
  });
};

const renderTable = () => {
  if (!root.tableBody) return;

  const filtered = getFilteredCustomers();

  if (root.resultHint) {
    root.resultHint.textContent = `${filtered.length} ${filtered.length === 1 ? "klant" : "klanten"} zichtbaar.`;
  }

  root.tableBody.innerHTML = filtered.length
    ? filtered.map((customer) => `
      <tr class="${customer.id === state.selectedCustomerId ? "is-selected" : ""}" data-customer-row="${customer.id}">
        <td>${dash(customer.name)}</td>
        <td>${dash(customer.email)}</td>
        <td>${dash(customer.phone)}</td>
        <td>${formatDate(customer.createdAt)}</td>
        <td>${formatDateTime(customer.lastLoginAt)}</td>
        <td>${Number(customer.orderCount) || 0}</td>
        <td>${euro.format(Number(customer.totalSpent) || 0)}</td>
        <td><span class="admin-badge success">Actief</span></td>
      </tr>
    `).join("")
    : '<tr><td colspan="8">Geen klanten gevonden voor deze zoekopdracht.</td></tr>';

  root.tableBody.querySelectorAll("[data-customer-row]").forEach((rowEl) => {
    rowEl.addEventListener("click", () => {
      const customerId = Number(rowEl.dataset.customerRow);
      if (!customerId) return;
      openCustomerDetail(customerId);
    });
  });
};

const renderCustomerDetail = (customer) => {
  if (!root.detailCard) return;

  if (!customer) {
    root.detailCard.innerHTML = `
      <h3>Klantdetails</h3>
      <p class="admin-detail">Kies een klant in de lijst om alle details te bekijken.</p>
    `;
    return;
  }

  const orders = Array.isArray(customer.orders) ? customer.orders : [];

  root.detailCard.innerHTML = `
    <h3>${dash(customer.name)}</h3>
    <p class="admin-detail">Klant-ID ${escapeHtml(String(customer.id))}</p>

    <div class="admin-order-detail-grid">
      <article class="admin-mini-stat">
        <p class="admin-label">E-mail</p>
        <strong>${dash(customer.email)}</strong>
      </article>
      <article class="admin-mini-stat">
        <p class="admin-label">Telefoon</p>
        <strong>${dash(customer.phone)}</strong>
      </article>
      <article class="admin-mini-stat">
        <p class="admin-label">Geregistreerd</p>
        <strong>${formatDate(customer.createdAt)}</strong>
      </article>
      <article class="admin-mini-stat">
        <p class="admin-label">Laatste login</p>
        <strong>${formatDateTime(customer.lastLoginAt)}</strong>
      </article>
      <article class="admin-mini-stat">
        <p class="admin-label">Aantal bestellingen</p>
        <strong>${Number(customer.orderCount) || 0}</strong>
      </article>
      <article class="admin-mini-stat">
        <p class="admin-label">Totale bestelwaarde</p>
        <strong>${euro.format(Number(customer.totalSpent) || 0)}</strong>
      </article>
    </div>

    <div class="admin-order-block">
      <h4>Account</h4>
      <p>
        <strong>Status:</strong> Actief<br />
        <strong>Woonplaats:</strong> ${dash(customer.city)}<br />
        <strong>Land:</strong> ${dash(customer.country)}
      </p>
    </div>

    <div class="admin-order-block">
      <h4>Bestellingen</h4>
      <ul class="admin-order-items">
        ${orders.length
          ? orders.map((order) => `<li>${escapeHtml(order.number || "-")} · ${formatDate(order.createdAt)} · ${escapeHtml(order.status || "Nieuw")} · ${euro.format(Number(order.total) || 0)}</li>`).join("")
          : "<li>Geen bestellingen gevonden voor deze klant.</li>"}
      </ul>
    </div>
  `;
};

const openCustomerDetail = async (customerId) => {
  state.selectedCustomerId = customerId;
  renderTable();

  root.detailCard.innerHTML = `
    <h3>Klantdetails</h3>
    <p class="admin-detail">Klantgegevens worden geladen…</p>
  `;

  try {
    const customer = await fetchCustomerByIdFromApi(customerId);
    renderCustomerDetail(customer);
    root.detailCard?.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    root.detailCard.innerHTML = `
      <h3>Klantdetails</h3>
      <p class="admin-detail">${escapeHtml(error.message || "Klant kon niet worden geladen.")}</p>
    `;
  }
};

const render = () => {
  renderOverviewStats();
  renderTable();
};

const initialize = async () => {
  const user = await requireAdminSession();
  if (!user) return;

  if (root.sidebar) {
    root.sidebar.innerHTML = createAdminSidebar("customers");
  }
  if (root.topbar) {
    root.topbar.innerHTML = createAdminTopbar("Klanten");
  }
  wireAdminTopbar(user);

  root.search?.addEventListener("input", renderTable);

  try {
    state.customers = await fetchCustomersFromApi();
    setStatus(`${state.customers.length} klanten geladen vanuit database.`, "accent");
  } catch (error) {
    setStatus(error.message || "De server is niet bereikbaar. Probeer het later opnieuw.", "error");
  }

  render();
};

initialize().catch((error) => {
  console.error("Kon klanten niet initialiseren:", error);
  setStatus("Klanten konden niet worden geïnitialiseerd.", "muted");
});
