import { createAdminSidebar, createAdminTopbar } from "../components/layout.js";
import { requireAdminSession, wireAdminTopbar } from "./admin-auth.js";
import {
  backupLegacyLocalOrders,
  deleteOrderByNumber,
  getLegacyLocalOrders,
  getOrderByNumber,
  ORDER_STATUSES,
  getOrders,
  migrateLegacyLocalOrdersToApi,
  syncOrdersFromApi,
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
  migrateLegacy: document.getElementById("migrateLegacyOrdersButton"),
  migrationPreview: document.getElementById("legacyMigrationPreview"),
};

const state = {
  selectedOrderNumber: null,
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

const downloadText = (text, fileName) => {
  const blob = new Blob([text], { type: "application/json" });
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

  const order = getOrders().find((entry) => entry.number === state.selectedOrderNumber) || null;
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
      <button class="button secondary" type="button" data-print-order="${escapeHtml(order.number)}">Print order</button>
      <button class="button secondary" type="button" data-mark-confirmed="${escapeHtml(order.number)}">Markeer als bevestigd</button>
      <button class="button secondary" type="button" data-mark-shipped="${escapeHtml(order.number)}">Markeer als verzonden</button>
      <button class="button secondary" type="button" data-cancel-order="${escapeHtml(order.number)}">Annuleer order</button>
      <button class="button secondary" type="button" data-export-order="${escapeHtml(order.number)}">Exporteer order (JSON)</button>
      <button class="button secondary" type="button" data-delete-order="${escapeHtml(order.number)}">Verwijder testorder</button>
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
        <p class="admin-label">Subtotaal</p>
        <strong>${euro.format(Number(order.subtotal) || 0)}</strong>
      </article>
      <article class="admin-mini-stat">
        <p class="admin-label">Verzendkosten</p>
        <strong>${Number(order.shippingCost) > 0 ? euro.format(Number(order.shippingCost)) : (Number(order.subtotal) >= 75 ? "Gratis" : "Niet berekend")}</strong>
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
    try {
      await updateOrderStatus(order.number, "Bevestigd");
      setStatus("Order gemarkeerd als bevestigd.", "accent");
      render();
    } catch (error) {
      setStatus(error.message, "error");
    }
  });

  root.detailCard.querySelector("[data-mark-shipped]")?.addEventListener("click", async () => {
    try {
      await updateOrderStatus(order.number, "Verzonden");
      setStatus("Order gemarkeerd als verzonden.", "accent");
      render();
    } catch (error) {
      setStatus(error.message, "error");
    }
  });

  root.detailCard.querySelector("[data-cancel-order]")?.addEventListener("click", async () => {
    const confirmed = window.confirm("Weet je zeker dat je deze order wilt annuleren? Voorraad wordt eenmalig hersteld.");
    if (!confirmed) return;
    try {
      await updateOrderStatus(order.number, "Geannuleerd");
      setStatus("Order geannuleerd. Voorraad is hersteld waar nodig.", "accent");
      render();
    } catch (error) {
      setStatus(error.message, "error");
    }
  });

  root.detailCard.querySelector("[data-delete-order]")?.addEventListener("click", async () => {
    const confirmed = window.confirm("Weet je zeker dat je deze testorder wilt verwijderen?");
    if (!confirmed) return;
    try {
      await deleteOrderByNumber(order.number);
      state.selectedOrderNumber = null;
      setStatus("Testorder verwijderd.", "accent");
      render();
    } catch (error) {
      setStatus(error.message, "error");
    }
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
        <td>${order.isTestOrder === false ? "WhatsApp-bestelling" : "Testorder (lokaal)"}</td>
        <td>
          <button class="button secondary" type="button" data-open-order="${escapeHtml(order.number || "")}">Openen</button>
        </td>
      </tr>
    `).join("")
    : '<tr><td colspan="7">Geen bestellingen gevonden voor deze filters.</td></tr>';

  root.tableBody.querySelectorAll("[data-open-order]").forEach((button) => {
    button.addEventListener("click", async () => {
      const orderNumber = String(button.dataset.openOrder || "");
      if (!orderNumber) return;
      try {
        await getOrderByNumber(orderNumber);
        state.selectedOrderNumber = orderNumber;
        renderOrderDetails();
        root.detailCard?.scrollIntoView({ behavior: "smooth", block: "start" });
      } catch (error) {
        setStatus(error.message, "error");
      }
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

      const order = getOrders().find((entry) => Number(entry.id) === orderId);
      if (!order?.number) {
        setStatus("Ordernummer ontbreekt voor deze bestelling.", "error");
        renderTable();
        return;
      }

      try {
        await updateOrderStatus(order.number, nextStatus);
        setStatus("Orderstatus bijgewerkt.", "accent");
        if (state.selectedOrderNumber === order.number) {
          renderOrderDetails();
        }
        renderTable();
      } catch (error) {
        setStatus(error.message, "error");
        renderTable();
      }
    });
  });
};

const renderLegacyMigrationPreview = () => {
  if (!root.migrationPreview) return;

  const legacy = getLegacyLocalOrders();
  if (!legacy.length) {
    root.migrationPreview.style.display = "none";
    root.migrationPreview.innerHTML = "";
    return;
  }

  root.migrationPreview.style.display = "block";
  root.migrationPreview.innerHTML = `
    <h4>Migratievoorbeeld lokale testorders</h4>
    <p class="admin-detail">${legacy.length} lokale order${legacy.length === 1 ? "" : "s"} gevonden in localStorage.</p>
    <ul>
      ${legacy.slice(0, 5).map((order) => `<li>${escapeHtml(order.number || "zonder nummer")} - ${escapeHtml(order.customer?.name || "onbekende klant")}</li>`).join("")}
    </ul>
    <p class="admin-detail">Eerst wordt een handmatige back-up gedownload. Lokale orders blijven behouden totdat de API-migratie slaagt.</p>
    <div class="admin-form-actions">
      <button class="button secondary" type="button" id="downloadLegacyBackupButton">Download back-up</button>
      <button class="button primary" type="button" id="runLegacyMigrationButton">Migratie starten</button>
      <button class="button secondary" type="button" id="hideLegacyMigrationButton">Sluiten</button>
    </div>
  `;

  document.getElementById("downloadLegacyBackupButton")?.addEventListener("click", () => {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    downloadText(backupLegacyLocalOrders(), `legacy-testorders-backup-${stamp}.json`);
    setStatus("Back-up van lokale testorders gedownload.", "accent");
  });

  document.getElementById("runLegacyMigrationButton")?.addEventListener("click", async () => {
    const confirmed = window.confirm("Eerst back-up downloaden en daarna lokale testorders naar de API migreren?");
    if (!confirmed) return;

    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    downloadText(backupLegacyLocalOrders(), `legacy-testorders-backup-${stamp}.json`);

    const result = await migrateLegacyLocalOrdersToApi(legacy);
    if (result.errors.length) {
      setStatus(`Migratie deels voltooid: ${result.migrated.length} gelukt, ${result.errors.length} mislukt.`, "error");
    } else {
      setStatus(`Migratie geslaagd: ${result.migrated.length} orders overgezet.`, "accent");
    }
    await syncOrdersFromApi();
    render();
  });

  document.getElementById("hideLegacyMigrationButton")?.addEventListener("click", () => {
    root.migrationPreview.style.display = "none";
    root.migrationPreview.innerHTML = "";
  });
};

const bindToolbarActions = () => {
  root.exportAll?.addEventListener("click", () => {
    const orders = getOrders();
    downloadJson(orders, "lootifer-orders-export.json");
    setStatus("Alle orders geëxporteerd als JSON.", "accent");
  });

  root.deleteAllTests?.addEventListener("click", () => {
    const run = async () => {
      const testOrders = getOrders().filter((order) => order.isTestOrder !== false);
      if (!testOrders.length) {
        setStatus("Geen testorders om te verwijderen.", "muted");
        return;
      }

      const confirmed = window.confirm(`Weet je zeker dat je ${testOrders.length} testorders wilt verwijderen?`);
      if (!confirmed) return;

      for (const order of testOrders) {
        await deleteOrderByNumber(order.number);
      }

      await syncOrdersFromApi();
      state.selectedOrderNumber = null;
      render();
      setStatus("Alle testorders zijn verwijderd via de database.", "accent");
    };

    run().catch((error) => {
      setStatus(error.message, "error");
    });
  });

  root.migrateLegacy?.addEventListener("click", () => {
    renderLegacyMigrationPreview();
    if (!getLegacyLocalOrders().length) {
      setStatus("Geen oude lokale testorders gevonden voor migratie.", "muted");
    }
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

const initialize = async () => {
  const user = await requireAdminSession();
  if (!user) return;

  if (root.sidebar) {
    root.sidebar.innerHTML = createAdminSidebar("orders");
  }
  if (root.topbar) {
    root.topbar.innerHTML = createAdminTopbar("Bestellingen");
  }
  wireAdminTopbar(user);

  renderStatusOptions();
  bindToolbarActions();

  try {
    await syncOrdersFromApi();
    setStatus("Bestellingen geladen vanuit database.", "accent");
    renderLegacyMigrationPreview();
  } catch {
    setStatus("De server is niet bereikbaar. Probeer het later opnieuw.", "error");
  }

  render();
};

window.addEventListener("lootifer:state-updated", render);
window.addEventListener("lootifer:inventory-updated", render);
initialize().catch((error) => {
  console.error("Kon bestellingen niet initialiseren:", error);
  setStatus("Bestellingen konden niet worden geïnitialiseerd.", "muted");
});
