import { createHeader } from "../../Components/Header.js";
import { createFooter } from "../../Components/Footer.js";
import { shoppingState } from "../../Components/Experience/shopping-state.js";
import { createShoppingUi, syncHeaderCounters } from "../../Components/Experience/shopping-ui.js";
import { formatCurrency, formatQuantity } from "./formatting.js";
import { createImageAttributes } from "../../Products/product-media.js";
import { getProductPriceLabel } from "../../Products/product-pricing.js";
import { addOrder, synchronizeCartWithInventory } from "../../Components/Experience/order-inventory.js";
import { getLootiferWhatsAppUrl } from "./store-config.js";
import { calculateOrderTotals, isNetherlands } from "../../Shared/shipping.js";
const headerRoot = document.getElementById("headerRoot");
const footerRoot = document.getElementById("footerRoot");
const checkoutForm = document.getElementById("checkoutForm");
const checkoutSummary = document.getElementById("checkoutSummary");
const checkoutMeta = document.getElementById("checkoutMeta");
const checkoutErrors = document.getElementById("checkoutErrors");
const checkoutConfirmation = document.getElementById("checkoutConfirmation");
const checkoutSubmitButton = document.getElementById("checkoutSubmitButton");

if (headerRoot) headerRoot.innerHTML = createHeader("checkout");
if (footerRoot) footerRoot.innerHTML = createFooter();

const shoppingRoot = document.createElement("div");
document.body.appendChild(shoppingRoot);
createShoppingUi({ root: shoppingRoot });

const postalCodePattern = /^[1-9][0-9]{3}\s?[A-Za-z]{2}$/;

const getFormValues = () => Object.fromEntries(new FormData(checkoutForm).entries());

const validateForm = (values, cart) => {
  const errors = [];

  if (!cart.length) errors.push("Je winkelwagen is leeg.");
  if (!values.name?.trim()) errors.push("Naam is verplicht.");
  if (!values.email?.trim()) errors.push("E-mail is verplicht.");
  if (!values.phone?.trim()) errors.push("Telefoonnummer is verplicht.");
  if (!values.street?.trim()) errors.push("Straat is verplicht.");
  if (!values.houseNumber?.trim()) errors.push("Huisnummer is verplicht.");
  if (!values.postalCode?.trim()) errors.push("Postcode is verplicht.");
else if (isNetherlands(values.country) && !postalCodePattern.test(values.postalCode.trim())) errors.push("Postcode moet een geldig Nederlands formaat hebben, bijvoorbeeld 1234 AB.");
  if (!values.city?.trim()) errors.push("Plaats is verplicht.");
  if (!values.country?.trim()) errors.push("Land is verplicht.");

  if (checkoutForm && !checkoutForm.checkValidity()) {
    checkoutForm.reportValidity();
  }

  return errors;
};

const renderSummary = () => {
  const cart = shoppingState.getCart();
  const subtotal = shoppingState.getCartSubtotal();
const country = document.getElementById("checkoutCountry")?.value || "Nederland";
const totals = calculateOrderTotals(subtotal, country);
const deliveryCard = document.querySelector(".checkout-delivery-card");
const deliveryText = deliveryCard?.querySelector("small");
const deliveryStatus = deliveryCard?.querySelector(".checkout-delivery-status");
const deliveryMethodInput = document.getElementById("checkoutDeliveryMethod");
const displayCountry = country.trim() || "Nederland";

if (totals.domesticShipping) {
  if (deliveryText) {
    deliveryText.textContent =
      "Nederland: €6,95 verzendkosten, gratis vanaf €75,00.";
  }

  if (deliveryStatus) deliveryStatus.textContent = "Nederland";

  if (deliveryMethodInput) {
    deliveryMethodInput.value = "Verzending binnen Nederland";
  }
} else {
  if (deliveryText) {
    deliveryText.textContent =
      "Internationale verzendkosten worden apart berekend en via WhatsApp bevestigd.";
  }

  if (deliveryStatus) deliveryStatus.textContent = displayCountry;

  if (deliveryMethodInput) {
    deliveryMethodInput.value =
      `Internationale verzending naar ${displayCountry} - kosten apart te bevestigen`;
  }
}
  const quantity = shoppingState.getCartQuantity();

  if (checkoutMeta) {
    checkoutMeta.textContent = `${formatQuantity(quantity)} artikel${quantity === 1 ? "" : "en"}`;
  }

  if (!checkoutSummary) return;

  if (!cart.length) {
    checkoutSummary.innerHTML = '<p class="card-empty">Je winkelwagen is leeg. Voeg eerst producten toe om verder te gaan.</p>';
    return;
  }

  checkoutSummary.innerHTML = `
    <div class="order-summary-list">
      ${cart
        .map(
          (item) => `
            <div class="drawer-item">
              <div class="drawer-item-media">
                <img ${createImageAttributes({ src: item.image, alt: item.name })} />
              </div>
              <div class="drawer-item-body">
                <strong>${item.name}</strong>
                <p>${getProductPriceLabel(item, formatCurrency)} · Aantal ${formatQuantity(item.quantity)}</p>
                <p class="cart-item-meta">${formatCurrency((Number(item.price) || 0) * (Number(item.quantity) || 0))}</p>
              </div>
            </div>
          `
        )
        .join("")}
      <div class="summary-line"><span>Subtotaal</span><strong>${formatCurrency(totals.subtotal)}</strong></div>
       
      <div class="order-summary-line"><span>${totals.internationalShippingPending ? "Internationale verzending" : "Verzendkosten Nederland"}</span><strong>${totals.internationalShippingPending ? "Apart te bevestigen" : (totals.hasFreeShipping ? "Gratis" : formatCurrency(totals.shippingCost))}</strong></div>
      <p class="shipping-threshold-note ${totals.hasFreeShipping ? "is-free" : ""}">${totals.internationalShippingPending ? "Internationale verzendkosten worden apart via WhatsApp bevestigd." : totals.hasFreeShipping ? "Je bestelling wordt gratis verzonden." : `Nog ${formatCurrency(totals.amountUntilFreeShipping)} tot gratis verzending.`}</p>
    </div>
  `;
};
const checkoutCountryInput = document.getElementById("checkoutCountry");

if (checkoutCountryInput) {
  checkoutCountryInput.addEventListener("input", renderSummary);
  checkoutCountryInput.addEventListener("change", renderSummary);
}
const showErrors = (errors = []) => {
  if (!checkoutErrors) return;
  if (!errors.length) {
    checkoutErrors.innerHTML = "";
    checkoutErrors.style.display = "none";
    return;
  }

  checkoutErrors.style.display = "block";
  checkoutErrors.innerHTML = `<ul>${errors.map((error) => `<li>${error}</li>`).join("")}</ul>`;
};

const escapeHtml = (value = "") => String(value)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#039;");

const buildWhatsAppMessage = (order) => {
  const itemLines = (order.items || [])
    .map((item) => `- ${item.name} x${formatQuantity(item.quantity)} (${formatCurrency((Number(item.price) || 0) * (Number(item.quantity) || 0))})`)
    .join("\n");

  const customer = order.customer || {};
  const address = `${customer.street || ""} ${customer.houseNumber || ""}, ${customer.postalCode || ""} ${customer.city || ""}, ${customer.country || ""}`
    .replace(/\s+/g, " ")
    .trim();

  return [
    "Hallo Lootifer Collectibles!",
    "",
    `Ik heb bestelling ${order.number} geplaatst en wil de betaling afronden.`,
    "",
    "Producten:",
    itemLines,
    "",
    `Subtotaal: ${formatCurrency(order.subtotal)}`,
    `Verzendkosten: ${Number(order.shippingCost) > 0 ? formatCurrency(order.shippingCost) : "Gratis"}`,
    `Totaal: ${formatCurrency(order.total)}`,
    "",
    `Naam: ${customer.name || ""}`,
    `E-mail: ${customer.email || ""}`,
    `Telefoon: ${customer.phone || ""}`,
    `Bezorgadres: ${address}`,
    order.notes ? `Opmerking: ${order.notes}` : "",
  ].filter(Boolean).join("\n");
};

const showConfirmation = (order, whatsappUrl, whatsappOpened) => {
  if (!checkoutConfirmation) return;

  const itemRows = (order.items || [])
    .map((item) => `<li>${escapeHtml(item.name)} × ${formatQuantity(item.quantity)} - ${formatCurrency((Number(item.price) || 0) * (Number(item.quantity) || 0))}</li>`)
    .join("");

  const deliveryAddress = `${order.customer.street} ${order.customer.houseNumber}, ${order.customer.postalCode} ${order.customer.city}, ${order.customer.country}`;

  checkoutConfirmation.hidden = false;
  checkoutConfirmation.innerHTML = `
    <p class="order-number">Bestelling ${escapeHtml(order.number)}</p>
    <h2>Je bestelling is opgeslagen.</h2>
    <p>${whatsappOpened ? "WhatsApp is geopend om de betaling af te ronden." : "Open WhatsApp om de betaling af te ronden."}</p>
    <div class="confirmation-note confirmation-grid" style="margin-top: 1rem; text-align: left;">
      <div><strong>Levering:</strong><br />Verzending binnen Nederland</div>
      <div><strong>Status:</strong><br />${escapeHtml(order.status)}</div>
      <div><strong>Subtotaal:</strong><br />${formatCurrency(order.subtotal)}</div>
      <div><strong>Verzendkosten:</strong><br />${Number(order.shippingCost) > 0 ? formatCurrency(order.shippingCost) : "Gratis"}</div>
      <div><strong>Totaal:</strong><br />${formatCurrency(order.total)}</div>
      <div><strong>Betaling:</strong><br />Via WhatsApp af te stemmen</div>
      <div><strong>Klant:</strong><br />${escapeHtml(order.customer.name)}<br />${escapeHtml(order.customer.email)}<br />${escapeHtml(order.customer.phone)}</div>
      <div><strong>Bezorgadres:</strong><br />${escapeHtml(deliveryAddress)}</div>
      ${order.notes ? `<div class="full-span"><strong>Notities:</strong><br />${escapeHtml(order.notes)}</div>` : ""}
      <div class="full-span"><strong>Producten:</strong><ul class="confirmation-items">${itemRows}</ul></div>
    </div>
    <div class="checkout-actions confirmation-actions">
      <a class="button primary whatsapp-checkout-button" href="${whatsappUrl}" target="_blank" rel="noopener noreferrer">
        <span>Open WhatsApp</span>
      </a>
      <button class="button secondary" type="button" id="printConfirmationButton">Print bevestiging</button>
      <a class="button secondary" href="shop.html">Terug naar winkel</a>
    </div>
  `;

  document.getElementById("printConfirmationButton")?.addEventListener("click", () => window.print());
};

const setSubmitting = (submitting) => {
  if (!checkoutSubmitButton) return;
  checkoutSubmitButton.disabled = submitting;
  checkoutSubmitButton.classList.toggle("is-loading", submitting);
  const label = checkoutSubmitButton.querySelector("span");
  if (label) label.textContent = submitting ? "Bestelling opslaan…" : "Bestelling plaatsen via WhatsApp";
};

checkoutForm?.addEventListener("submit", (event) => {
  event.preventDefault();

  const run = async () => {
    const values = getFormValues();
    const initialCart = shoppingState.getCart();
    const initialErrors = validateForm(values, initialCart);

    if (initialErrors.length) {
      showErrors(initialErrors);
      return;
    }

    showErrors([]);
    setSubmitting(true);

    try {
      const sync = await synchronizeCartWithInventory();
      const cart = sync.cart;

      if (sync.warnings.length) {
        showErrors(["Voorraad is bijgewerkt voordat je bestelde:", ...sync.warnings]);
        renderSummary();
        return;
      }

      const errors = validateForm(values, cart);
      if (errors.length) {
        showErrors(errors);
        return;
      }

      const subtotal = shoppingState.getCartSubtotal();
      const totals = calculateOrderTotals(subtotal, values.country);
      const order = {
        status: "Nieuw",
        paymentStatus: "Via WhatsApp af te stemmen",
        isTestOrder: false,
        stockRestoredAt: null,
        deliveryMethod: totals.domesticShipping
  ? "Verzending binnen Nederland"
  : `Internationale verzending naar ${values.country.trim()} - kosten apart te bevestigen`,
        shippingCost: totals.shippingCost,
        total: totals.total,
        subtotal: totals.subtotal,
        customer: {
          name: values.name.trim(),
          email: values.email.trim(),
          phone: values.phone.trim(),
          street: values.street.trim(),
          houseNumber: values.houseNumber.trim(),
          postalCode: values.postalCode.trim(),
          city: values.city.trim(),
          country: values.country.trim(),
        },
        notes: values.notes?.trim() || "",
        items: cart.map((item) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          image: item.image,
        })),
      };

      // Eerst de order en voorraadwijziging in SQLite vastleggen.
      const persistedOrder = await addOrder(order);
      const whatsappUrl = getLootiferWhatsAppUrl(buildWhatsAppMessage(persistedOrder));

      shoppingState.clearCart();
      checkoutForm.reset();
      renderSummary();
      syncHeaderCounters();

      // Ga rechtstreeks in hetzelfde tabblad naar WhatsApp.
      window.location.href = whatsappUrl;
      return;
    } catch (error) {
      console.error("Afrekenen mislukt:", error);
      showErrors([error?.message || "Er ging iets mis bij het verwerken van de bestelling."]);
    } finally {
      setSubmitting(false);
    }
  };

  run();
});

const initializeCheckout = async () => {
  try {
    const sync = await synchronizeCartWithInventory();
    if (sync.warnings.length) {
      showErrors(["Voorraad is gewijzigd sinds je producten toevoegde:", ...sync.warnings]);
    }
  } catch (error) {
    console.error("Voorraadsynchronisatie mislukt:", error);
  }
  renderSummary();
};

window.addEventListener("lootifer:state-updated", renderSummary);
window.addEventListener("lootifer:inventory-updated", initializeCheckout);
initializeCheckout();
