import { getOrders, syncOrdersFromApi } from "../../Components/Experience/order-inventory.js";
import { formatCurrency } from "../../Assets/Js/formatting.js";

const root = document.getElementById("ordersOverview");

const formatDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const renderOrders = () => {
  if (!root) return;

  const orders = getOrders();
  root.innerHTML = `
    <div class="admin-card">
      <h3>Testbestellingen</h3>
      <p class="admin-detail">Bestellingen uit de beveiligde databaseomgeving.</p>
      <table class="admin-table">
        <thead>
          <tr>
            <th>Ordernummer</th>
            <th>Klant</th>
            <th>Datum</th>
            <th>Totaal</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${orders.length
            ? orders
                .map(
                  (order) => `
                    <tr>
                      <td>${order.number}</td>
                      <td>${order.customer?.name || "-"}<br /><span class="admin-detail">${order.customer?.email || ""}</span></td>
                      <td>${formatDate(order.createdAt)}</td>
                      <td>${formatCurrency(order.total || 0)}</td>
                      <td>${order.status || "Ontvangen"}</td>
                    </tr>
                  `
                )
                .join("")
            : '<tr><td colspan="5">Nog geen testbestellingen opgeslagen.</td></tr>'}
        </tbody>
      </table>
    </div>
  `;
};

renderOrders();
syncOrdersFromApi().then(renderOrders).catch(() => {
  // Keep existing rendered state when server is unavailable.
});
window.addEventListener("lootifer:state-updated", renderOrders);