import { createAdminSidebar, createAdminTopbar } from "../components/layout.js";
import {
  ORDER_STATUSES,
  deleteAllTestOrders,
  deleteOrderById,
  getOrderById,
  getOrders,
  updateOrderStatus,
} from "../../Components/Experience/order-inventory.js";

const euro = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" });

const root = {
  sidebar: document.getElementById("adminSidebar"),
  topbar: document.getElementById("adminTopbar"),
  status: document.getElementById("ordersStatus"),
  resultHint: document.getElementById("ordersResultHint"),
  tableBody: document.getElementById("ordersTableBody"),
  detailCard: document.getElementById("orderDetailCard"),
  search: document.getElementById("orderSearch"),
  statusFilter: document.getElementById("orderStatusFilter"),
  dateFilter: document.getElementById("orderDateFilter"),
  customerFilter: document.getElementById("orderCustomerFilter"),
  exportAll: document.getElementById("exportAllOrdersButton"),
  deleteAllTests: document.getElementById("deleteAllTestOrdersButton"),
};

const state = {
  selectedOrderId: null,
};

const escapeHtml = (value = "") => String(value)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/\"/g, "&quot;")
  .replace(/'/g, "&#39;");

const formatDateTime = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleString("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const downloadJson = (data, fileName) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const setStatus = (message, tone = "muted") => {
  if (!root.status) return;
  root.status.textContent = message;
  root.status.dataset.tone = tone;
};

const getFilteredOrders = () => {
  const allOrders = getOrders();
  const query = String(root.search?.value || "").trim().toLowerCase();
  const status = String(root.statusFilter?.value || "").trim();
  const date = String(root.dateFilter?.value || "").trim();
  const customer = String(root.customerFilter?.value || "").trim().toLowerCase();

  return allOrders.filter((order) => {
    const customerName = String(order.customer?.name || "").toLowerCase();
    const customerEmail = String(order.customer?.email || "").toLowerCase();
    const orderNumber = String(order.number || "").toLowerCase();
    const createdDate = order.createdAt ? new Date(order.createdAt).toISOString().slice(0, 10) : "";

    const matchesQuery = !query || orderNumber.includes(query) || customerName.includes(query) || customerEmail.includes(query);
    const matchesStatus = !status || String(order.status || "Nieuw") === status;
    const matchesDate = !date || createdDate === date;
    const matchesCustomer = !customer || customerName.includes(customer);

    return matchesQuery && matchesStatus && matchesDate && matchesCustomer;
  });
};

const renderStatusOptions = () => {
  if (!root.statusFilter) return;
  const previous = root.statusFilter.value;
  root.statusFilter.innerHTML = `<option value="">Alle statussen</option>${ORDER_STATUSES.map((status) => `<option value="${escapeHtml(status)}">${escapeHtml(status)}</option>`).join("")}`;
  if (ORDER_STATUSES.includes(previous)) {
    root.statusFilter.value = previous;
  }
};

const renderOrderDetails = () => {
  if (!root.detailCard) return;

  const order = getOrderById(state.selectedOrderId);
  if (!order) {
    root.detailCard.innerHTML = `
      <h3>Orderdetails</h3>
      <p class="admin-detail">Kies een order in de lijst om alle details te bekijken.</p>
    `;
    return;
  }

  const address = `${order.customer?.street || ""} ${order.customer?.houseNumber || ""}, ${order.customer?.postalCode || ""} ${order.customer?.city || ""}, ${order.customer?.country || ""}`.trim();
  const items = Array.isArray(order.items) ? order.items : [];

  root.detailCard.innerHTML = `
    <h3>Order ${escapeHtml(order.number || "-")}</h3>
    <p class="admin-detail">Lokaal opgeslagen testorder${order.isTestOrder === false ? "" : " (test)"}.</p>

    <div class="admin-form-actions">
      <button class="button secondary" type="button" data-print-order="${order.id}">Print order</button>
      <button class="button secondary" type="button" data-mark-confirmed="${order.id}">Markeer als bevestigd</button>
      <button class="button secondary" type="button" data-mark-shipped="${order.id}">Markeer als verzonden</button>
      <button class="button secondary" type="button" data-cancel-order="${order.id}">Annuleer order</button>
      <button class="button secondary" type="button" data-export-order="${order.id}">Exporteer order (JSON)</button>
      <button class="button secondary" type="button" data-delete-order="${order.id}">Verwijder testorder</button>
    </div>

    <div class="admin-order-detail-grid">
      <article class="admin-mini-stat">
        <p class="admin-label">Status</p>
        <strong>${escapeHtml(order.status || "Nieuw")}</strong>
      </article>
      <article class="admin-mini-stat">
        <p class="admin-label">Aangemaakt</p>
        <strong>${escapeHtml(formatDateTime(order.createdAt))}</strong>
      </article>
      <article class="admin-mini-stat">
        <p class="admin-label">Totaal</p>
        <strong>${euro.format(Number(order.total) || 0)}</strong>
      </article>
      <article class="admin-mini-stat">
        <p class="admin-label">Voorraad herstel</p>
        <strong>${order.stockRestoredAt ? "Uitgevoerd" : "Niet hersteld"}</strong>
      </article>
    </div>

    <div class="admin-order-block">
      <h4>Klantgegevens</h4>
      <p>
        <strong>${escapeHtml(order.customer?.name || "-")}</strong><br />
        ${escapeHtml(order.customer?.email || "-")}<br />
        ${escapeHtml(order.customer?.phone || "-")}
      </p>
    </div>

    <div class="admin-order-block">
      <h4>Levering</h4>
      <p>
        <strong>Methode:</strong> ${escapeHtml(order.deliveryMethod || "-")}<br />
        <strong>Adres:</strong> ${escapeHtml(address || "-")}
      </p>
    </div>

    <div class="admin-order-block">
      <h4>Producten</h4>
      <ul class="admin-order-items">
        ${items.map((item) => `<li>${escapeHtml(item.name || "Product")} × ${Number(item.quantity) || 0} - ${euro.format((Number(item.price) || 0) * (Number(item.quantity) || 0))}</li>`).join("") || "<li>Geen producten in order.</li>"}
      </ul>
    </div>

    <div class="admin-order-block">
      <h4>Notities</h4>
      <p>${escapeHtml(order.notes || "-")}</p>
    </div>
  `;

  root.detailCard.querySelector("[data-print-order]")?.addEventListener("click", () => window.print());

  root.detailCard.querySelector("[data-mark-confirmed]")?.addEventListener("click", async () => {
    await updateOrderStatus(order.id, "Bevestigd");
    setStatus("Order gemarkeerd als bevestigd.", "accent");
    render();
  });

  root.detailCard.querySelector("[data-mark-shipped]")?.addEventListener("click", async () => {
    await updateOrderStatus(order.id, "Verzonden");
    setStatus("Order gemarkeerd als verzonden.", "accent");
    render();
  });

  root.detailCard.querySelector("[data-cancel-order]")?.addEventListener("click", async () => {
    const confirmed = window.confirm("Weet je zeker dat je deze order wilt annuleren? Voorraad wordt eenmalig hersteld.");
    if (!confirmed) return;
    await updateOrderStatus(order.id, "Geannuleerd");
    setStatus("Order geannuleerd. Voorraad is hersteld waar nodig.", "accent");
    render();
  });

  root.detailCard.querySelector("[data-delete-order]")?.addEventListener("click", () => {
    const confirmed = window.confirm("Weet je zeker dat je deze testorder wilt verwijderen?");
    if (!confirmed) return;
    deleteOrderById(order.id);
    state.selectedOrderId = null;
    setStatus("Testorder verwijderd.", "accent");
    render();
  });

  root.detailCard.querySelector("[data-export-order]")?.addEventListener("click", () => {
    downloadJson(order, `order-${order.number || order.id}.json`);
    setStatus("Order geëxporteerd als JSON.", "accent");
  });
};

const renderTable = () => {
  if (!root.tableBody) return;

  const visibleOrders = getFilteredOrders();
  if (root.resultHint) {
    root.resultHint.textContent = `${visibleOrders.length} bestelling${visibleOrders.length === 1 ? "" : "en"} zichtbaar.`;
  }

  root.tableBody.innerHTML = visibleOrders.length
    ? visibleOrders.map((order) => `
      <tr>
        <td><strong>${escapeHtml(order.number || "-")}</strong></td>
        <td>${escapeHtml(formatDateTime(order.createdAt))}</td>
        <td>
          ${escapeHtml(order.customer?.name || "-")}<br />
          <span class="admin-detail">${escapeHtml(order.customer?.email || "-")}</span><br />
          <span class="admin-detail">${escapeHtml(order.customer?.phone || "-")}</span>
        </td>
        <td>${euro.format(Number(order.total) || 0)}</td>
        <td>
          <select data-order-status="${order.id}" class="admin-inline-select">
            ${ORDER_STATUSES.map((status) => `<option value="${escapeHtml(status)}" ${status === (order.status || "Nieuw") ? "selected" : ""}>${escapeHtml(status)}</option>`).join("")}
          </select>
        </td>
        <td>${order.isTestOrder === false ? "Productie" : "Testorder (lokaal)"}</td>
        <td>
          <button class="button secondary" type="button" data-open-order="${order.id}">Openen</button>
        </td>
      </tr>
    `).join("")
    : '<tr><td colspan="7">Geen bestellingen gevonden voor deze filters.</td></tr>';

  root.tableBody.querySelectorAll("[data-open-order]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedOrderId = Number(button.dataset.openOrder || 0);
      renderOrderDetails();
      root.detailCard?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  root.tableBody.querySelectorAll("[data-order-status]").forEach((select) => {
    select.addEventListener("change", async () => {
      const orderId = Number(select.dataset.orderStatus || 0);
      const nextStatus = String(select.value || "Nieuw");

      if (nextStatus === "Geannuleerd") {
        const confirmed = window.confirm("Order annuleren? Voorraadherstel wordt automatisch en slechts eenmaal uitgevoerd.");
        if (!confirmed) {
          render();
          return;
        }
      }

      await updateOrderStatus(orderId, nextStatus);
      setStatus("Orderstatus bijgewerkt.", "accent");
      if (state.selectedOrderId === orderId) {
        renderOrderDetails();
      }
      renderTable();
    });
  });
};

const bindToolbarActions = () => {
  root.exportAll?.addEventListener("click", () => {
    const orders = getOrders();
    downloadJson(orders, "lootifer-orders-export.json");
    setStatus("Alle orders geëxporteerd als JSON.", "accent");
  });

  root.deleteAllTests?.addEventListener("click", () => {
    const confirmed = window.confirm("Weet je zeker dat je alle lokaal opgeslagen testorders wilt verwijderen?");
    if (!confirmed) return;

    const { backup } = deleteAllTestOrders();
    if (backup.length) {
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      downloadJson(backup, `testorders-backup-${stamp}.json`);
      setStatus("Testorders verwijderd. Eerst is een back-up gedownload.", "accent");
    } else {
      setStatus("Er waren geen testorders om te verwijderen.", "muted");
    }

    state.selectedOrderId = null;
    render();
  });

  [root.search, root.statusFilter, root.dateFilter, root.customerFilter].forEach((field) => {
    field?.addEventListener("input", renderTable);
    field?.addEventListener("change", renderTable);
  });
};

const render = () => {
  renderTable();
  renderOrderDetails();
};

const initialize = () => {
  if (root.sidebar) {
    root.sidebar.innerHTML = createAdminSidebar("orders");
  }
  if (root.topbar) {
    root.topbar.innerHTML = createAdminTopbar("Bestellingen");
  }

  renderStatusOptions();
  bindToolbarActions();
  render();
};

window.addEventListener("lootifer:state-updated", render);
window.addEventListener("lootifer:inventory-updated", render);
initialize();
