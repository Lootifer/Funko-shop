import { createHeader } from "../../Components/Header.js";
import { createFooter } from "../../Components/Footer.js";
import { shoppingState } from "../../Components/Experience/shopping-state.js";
import { createShoppingUi, syncHeaderCounters } from "../../Components/Experience/shopping-ui.js";
import { formatCurrency, formatQuantity } from "./formatting.js";
import { createImageAttributes } from "../../Products/product-media.js";
import { getProductPriceLabel } from "../../Products/product-pricing.js";
import { addOrder, synchronizeCartWithInventory } from "../../Components/Experience/order-inventory.js";
import { getLootiferWhatsAppUrl } from "./store-config.js";
import { calculateOrderTotals } from "../../Shared/shipping.js";

const headerRoot = document.getElementById("headerRoot");
const footerRoot = document.getElementById("footerRoot");
const checkoutForm = document.getElementById("checkoutForm");
const checkoutSummary = document.getElementById("checkoutSummary");
const checkoutMeta = document.getElementById("checkoutMeta");
const checkoutErrors = document.getElementById("checkoutErrors");
const checkoutConfirmation = document.getElementById("checkoutConfirmation");
const checkoutSubmitButton = document.getElementById("checkoutSubmitButton");
const checkoutDeliveryMethod = document.getElementById("checkoutDeliveryMethod");
const checkoutDeliveryStatus = document.querySelector(".checkout-delivery-status");
const addressAutoFillHint = document.getElementById("addressAutoFillHint");

if (headerRoot) headerRoot.innerHTML = createHeader("checkout");
if (footerRoot) footerRoot.innerHTML = createFooter();

const shoppingRoot = document.createElement("div");
document.body.appendChild(shoppingRoot);
createShoppingUi({ root: shoppingRoot });

const postalCodePattern = /^[1-9][0-9]{3}\s?[A-Za-z]{2}$/;

const normalizeCountry = (country = "") =>
  String(country).trim().toLowerCase();

const isNetherlandsCountry = (country = "") =>
  ["nederland", "netherlands"].includes(normalizeCountry(country));

const getFormValues = () =>
  Object.fromEntries(new FormData(checkoutForm).entries());

const getShippingText = (country, shippingCost) => {
  if (!isNetherlandsCountry(country)) {
    return "N.t.b. - apart te bevestigen";
  }

  return Number(shippingCost) > 0
    ? formatCurrency(shippingCost)
    : "Gratis";
};

const updateDeliveryUi = (country = "Nederland") => {
  const isNetherlands = isNetherlandsCountry(country);

  if (checkoutDeliveryStatus) {
    checkoutDeliveryStatus.textContent = isNetherlands
      ? "Nederland"
      : "Buitenland";
  }

  if (checkoutDeliveryMethod) {
    checkoutDeliveryMethod.value = isNetherlands
      ? "Verzending binnen Nederland"
      : "Internationale verzending - kosten apart te bevestigen via WhatsApp";
  }

  if (addressAutoFillHint) {
    addressAutoFillHint.textContent = isNetherlands
      ? "Vul eerst postcode en huisnummer in. Straat en plaats worden daarna automatisch ingevuld."
      : "Voor adressen buiten Nederland vul je postcode, huisnummer, straat en plaats handmatig in.";
  }
};

const validateForm = (values, cart) => {
  const errors = [];
  const country = values.country?.trim() || "Nederland";
  const isNetherlands = isNetherlandsCountry(country);

  if (!cart.length) errors.push("Je winkelwagen is leeg.");
  if (!values.name?.trim()) errors.push("Naam is verplicht.");
  if (!values.email?.trim()) errors.push("E-mail is verplicht.");
  if (!values.phone?.trim()) errors.push("Telefoonnummer is verplicht.");
  if (!values.street?.trim()) errors.push("Straat is verplicht.");
  if (!values.houseNumber?.trim()) errors.push("Huisnummer is verplicht.");

  if (!values.postalCode?.trim()) {
    errors.push("Postcode is verplicht.");
  } else if (
    isNetherlands &&
    !postalCodePattern.test(values.postalCode.trim())
  ) {
    errors.push("Postcode moet een geldig Nederlands formaat hebben.");
  }

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
  const country = getFormValues().country || "Nederland";
  const totals = calculateOrderTotals(subtotal, country);
  const quantity = shoppingState.getCartQuantity();
  const isNetherlands = isNetherlandsCountry(country);

  // Buiten Nederland worden verzendkosten niet vooraf opgeteld.
  // De kosten worden later apart via WhatsApp bevestigd.
  const displayTotal = isNetherlands ? totals.total : totals.subtotal;

  updateDeliveryUi(country);

  if (checkoutMeta) {
    checkoutMeta.textContent =
      `${formatQuantity(quantity)} artikel${quantity === 1 ? "" : "en"}`;
  }

  if (!checkoutSummary) return;

  if (!cart.length) {
    checkoutSummary.innerHTML =
      '<p class="card-empty">Je winkelwagen is leeg. Voeg eerst producten toe om verder te gaan.</p>';
    return;
  }

  const shippingTitle = isNetherlands
    ? "Verzendkosten Nederland"
    : "Verzendkosten buitenland";

  const shippingLabel = isNetherlands
    ? (totals.hasFreeShipping
        ? "Gratis"
        : formatCurrency(totals.shippingCost))
    : "N.t.b.";

  const shippingNote = isNetherlands
    ? (
        totals.hasFreeShipping
          ? "Je bestelling wordt gratis verzonden."
          : `Nog ${formatCurrency(totals.amountUntilFreeShipping)} voor gratis verzending.`
      )
    : "Verzendkosten worden apart via WhatsApp bevestigd.";

  checkoutSummary.innerHTML = `
    <div class="order-summary-list">
      ${cart
        .map(
          (item) => `
            <div class="drawer-item">
              <div class="drawer-item-media">
                <img ${createImageAttributes({
                  src: item.image,
                  alt: item.name,
                })} />
              </div>

              <div class="drawer-item-body">
                <strong>${item.name}</strong>
                <p>
                  ${getProductPriceLabel(item, formatCurrency)}
                  · Aantal ${formatQuantity(item.quantity)}
                </p>
                <p class="cart-item-meta">
                  ${formatCurrency(
                    (Number(item.price) || 0) *
                    (Number(item.quantity) || 0)
                  )}
                </p>
              </div>
            </div>
          `
        )
        .join("")}

      <div class="summary-line">
        <span>Subtotaal</span>
        <strong>${formatCurrency(totals.subtotal)}</strong>
      </div>

      <div class="summary-line">
        <span>${shippingTitle}</span>
        <strong>${shippingLabel}</strong>
      </div>

      <div class="summary-total">
        <span>Totaal</span>
        <strong>${formatCurrency(displayTotal)}</strong>
      </div>

      <p class="shipping-threshold-note ${
        isNetherlands && totals.hasFreeShipping ? "is-free" : ""
      }">
        ${shippingNote}
      </p>
    </div>
  `;
};


// Nederlandse adres-autofill via PDOK Locatieserver.
// Werkt alleen bij Nederland. Als PDOK niet bereikbaar is, blijven straat en plaats handmatig invulbaar.
const postalCodeInput = checkoutForm?.querySelector('[name="postalCode"]');
const houseNumberInput = checkoutForm?.querySelector('[name="houseNumber"]');
const streetInput = checkoutForm?.querySelector('[name="street"]');
const cityInput = checkoutForm?.querySelector('[name="city"]');

let addressLookupTimer = null;
let addressLookupController = null;
let lastAddressLookupKey = "";

const normalizePostalCode = (value = "") =>
  String(value).trim().replace(/\s+/g, "").toUpperCase();

const lookupDutchAddress = async () => {
  if (!checkoutForm || !postalCodeInput || !houseNumberInput || !streetInput || !cityInput) {
    return;
  }

  const values = getFormValues();
  if (!isNetherlandsCountry(values.country || "Nederland")) return;

  const postalCode = normalizePostalCode(postalCodeInput.value);
  const houseNumber = String(houseNumberInput.value || "").trim();

  if (!/^[1-9][0-9]{3}[A-Z]{2}$/.test(postalCode) || !houseNumber) {
    return;
  }

  const lookupKey = `${postalCode}|${houseNumber.toUpperCase()}`;
  if (lookupKey === lastAddressLookupKey) return;

  addressLookupController?.abort();
  addressLookupController = new AbortController();

  try {
    const query = encodeURIComponent(`${postalCode} ${houseNumber}`);
    const url =
      `https://api.pdok.nl/bzk/locatieserver/search/v3_1/free` +
      `?q=${query}&fq=type%3Aadres&rows=5`;

    const response = await fetch(url, {
      method: "GET",
      signal: addressLookupController.signal,
      headers: { Accept: "application/json" },
    });

    if (!response.ok) return;

    const payload = await response.json();
    const docs = Array.isArray(payload?.response?.docs)
      ? payload.response.docs
      : [];

    if (!docs.length) return;

    const wantedHouseNumber = Number.parseInt(houseNumber, 10);
    const match =
      docs.find((doc) => {
        const docPostalCode = normalizePostalCode(doc?.postcode || "");
        const docHouseNumber = Number(doc?.huisnummer);
        return (
          docPostalCode === postalCode &&
          Number.isFinite(wantedHouseNumber) &&
          docHouseNumber === wantedHouseNumber
        );
      }) || docs[0];

    const street = String(match?.straatnaam || "").trim();
    const city = String(match?.woonplaatsnaam || "").trim();

    if (!street || !city) return;

    streetInput.value = street;
    cityInput.value = city;
    lastAddressLookupKey = lookupKey;

    streetInput.dispatchEvent(new Event("input", { bubbles: true }));
    cityInput.dispatchEvent(new Event("input", { bubbles: true }));
  } catch (error) {
    if (error?.name !== "AbortError") {
      console.warn("Adres automatisch invullen is niet gelukt:", error);
    }
  }
};

const scheduleAddressLookup = () => {
  window.clearTimeout(addressLookupTimer);
  addressLookupTimer = window.setTimeout(lookupDutchAddress, 450);
};

postalCodeInput?.addEventListener("input", scheduleAddressLookup);
postalCodeInput?.addEventListener("blur", lookupDutchAddress);
houseNumberInput?.addEventListener("input", scheduleAddressLookup);
houseNumberInput?.addEventListener("blur", lookupDutchAddress);

const countrySelect = checkoutForm?.querySelector('[name="country"]');

countrySelect?.addEventListener("change", () => {
  renderSummary();

  if (isNetherlandsCountry(countrySelect.value)) {
    scheduleAddressLookup();
  }
});

const showErrors = (errors = []) => {
  if (!checkoutErrors) return;

  if (!errors.length) {
    checkoutErrors.innerHTML = "";
    checkoutErrors.style.display = "none";
    return;
  }

  checkoutErrors.style.display = "block";
  checkoutErrors.innerHTML =
    `<ul>${errors.map((error) => `<li>${error}</li>`).join("")}</ul>`;
};

const escapeHtml = (value = "") => String(value)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#039;");

const buildWhatsAppMessage = (order) => {
  const itemLines = (order.items || [])
    .map(
      (item) =>
        `- ${item.name} x${formatQuantity(item.quantity)} ` +
        `(${formatCurrency(
          (Number(item.price) || 0) *
          (Number(item.quantity) || 0)
        )})`
    )
    .join("\n");

  const customer = order.customer || {};
  const country = customer.country || "Nederland";
  const address =
    `${customer.street || ""} ${customer.houseNumber || ""}, ` +
    `${customer.postalCode || ""} ${customer.city || ""}, ` +
    `${country}`
      .replace(/\s+/g, " ")
      .trim();

  const shippingText = getShippingText(country, order.shippingCost);

  return [
    "Hallo 2nd Life Toys!",
    "",
    `Ik heb bestelling ${order.number} geplaatst en wil de betaling afronden.`,
    "",
    "Producten:",
    itemLines,
    "",
    `Subtotaal: ${formatCurrency(order.subtotal)}`,
    `Verzendkosten: ${shippingText}`,
    `Totaal: ${formatCurrency(order.total)}`,
    "",
    `Naam: ${customer.name || ""}`,
    `E-mail: ${customer.email || ""}`,
    `Telefoon: ${customer.phone || ""}`,
    `Bezorgadres: ${address}`,
    order.notes ? `Opmerking: ${order.notes}` : "",
  ]
    .filter(Boolean)
    .join("\n");
};

const showConfirmation = (order, whatsappUrl, whatsappOpened) => {
  if (!checkoutConfirmation) return;

  const itemRows = (order.items || [])
    .map(
      (item) =>
        `<li>${escapeHtml(item.name)} × ${formatQuantity(item.quantity)} - ` +
        `${formatCurrency(
          (Number(item.price) || 0) *
          (Number(item.quantity) || 0)
        )}</li>`
    )
    .join("");

  const customer = order.customer || {};
  const country = customer.country || "Nederland";
  const isNetherlands = isNetherlandsCountry(country);

  const deliveryAddress =
    `${customer.street || ""} ${customer.houseNumber || ""}, ` +
    `${customer.postalCode || ""} ${customer.city || ""}, ${country}`;

  const deliveryLabel = isNetherlands
    ? "Verzending binnen Nederland"
    : "Internationale verzending - kosten apart te bevestigen via WhatsApp";

  const shippingText = getShippingText(country, order.shippingCost);

  checkoutConfirmation.hidden = false;
  checkoutConfirmation.innerHTML = `
    <p class="order-number">Bestelling ${escapeHtml(order.number)}</p>
    <h2>Je bestelling is opgeslagen.</h2>
    <p>${
      whatsappOpened
        ? "WhatsApp is geopend om de betaling af te ronden."
        : "Open WhatsApp om de betaling af te ronden."
    }</p>

    <div
      class="confirmation-note confirmation-grid"
      style="margin-top: 1rem; text-align: left;"
    >
      <div>
        <strong>Levering:</strong><br />
        ${escapeHtml(deliveryLabel)}
      </div>

      <div>
        <strong>Status:</strong><br />
        ${escapeHtml(order.status)}
      </div>

      <div>
        <strong>Subtotaal:</strong><br />
        ${formatCurrency(order.subtotal)}
      </div>

      <div>
        <strong>Verzendkosten:</strong><br />
        ${escapeHtml(shippingText)}
      </div>

      <div>
        <strong>Totaal:</strong><br />
        ${formatCurrency(order.total)}
      </div>

      <div>
        <strong>Betaling:</strong><br />
        Via WhatsApp af te stemmen
      </div>

      <div>
        <strong>Klant:</strong><br />
        ${escapeHtml(customer.name || "")}<br />
        ${escapeHtml(customer.email || "")}<br />
        ${escapeHtml(customer.phone || "")}
      </div>

      <div>
        <strong>Bezorgadres:</strong><br />
        ${escapeHtml(deliveryAddress)}
      </div>

      ${
        order.notes
          ? `<div class="full-span">
               <strong>Notities:</strong><br />
               ${escapeHtml(order.notes)}
             </div>`
          : ""
      }

      <div class="full-span">
        <strong>Producten:</strong>
        <ul class="confirmation-items">${itemRows}</ul>
      </div>
    </div>

    <div class="checkout-actions confirmation-actions">
      <a
        class="button primary whatsapp-checkout-button"
        href="${whatsappUrl}"
        target="_blank"
        rel="noopener noreferrer"
      >
        <span>Open WhatsApp</span>
      </a>

      <button
        class="button secondary"
        type="button"
        id="printConfirmationButton"
      >
        Print bevestiging
      </button>

      <a class="button secondary" href="shop.html">
        Terug naar winkel
      </a>
    </div>
  `;

  document
    .getElementById("printConfirmationButton")
    ?.addEventListener("click", () => window.print());
};

const setSubmitting = (submitting) => {
  if (!checkoutSubmitButton) return;

  checkoutSubmitButton.disabled = submitting;
  checkoutSubmitButton.classList.toggle("is-loading", submitting);

  const label = checkoutSubmitButton.querySelector("span");
  if (label) {
    label.textContent = submitting
      ? "Bestelling opslaan…"
      : "Bestelling plaatsen via WhatsApp";
  }
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
        showErrors([
          "Voorraad is bijgewerkt voordat je bestelde:",
          ...sync.warnings,
        ]);
        renderSummary();
        return;
      }

      const errors = validateForm(values, cart);
      if (errors.length) {
        showErrors(errors);
        return;
      }

      const country = values.country.trim() || "Nederland";
      const subtotal = shoppingState.getCartSubtotal();
      const totals = calculateOrderTotals(subtotal, country);
      const isNetherlands = isNetherlandsCountry(country);

      // Voor internationale bestellingen worden de verzendkosten pas
      // via WhatsApp bevestigd en dus niet vooraf bij het totaal opgeteld.
      const finalShippingCost = isNetherlands ? totals.shippingCost : 0;
      const finalTotal = isNetherlands ? totals.total : totals.subtotal;

      const order = {
        status: "Nieuw",
        paymentStatus: "Via WhatsApp af te stemmen",
        isTestOrder: false,
        stockRestoredAt: null,
        deliveryMethod: isNetherlands
          ? "Verzending binnen Nederland"
          : "Internationale verzending - kosten apart te bevestigen via WhatsApp",
        shippingCost: finalShippingCost,
        total: finalTotal,
        subtotal: totals.subtotal,
        customer: {
          name: values.name.trim(),
          email: values.email.trim(),
          phone: values.phone.trim(),
          street: values.street.trim(),
          houseNumber: values.houseNumber.trim(),
          postalCode: values.postalCode.trim(),
          city: values.city.trim(),
          country,
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

      // Bouw WhatsApp altijd op basis van de opgeslagen order.
      const whatsappUrl = getLootiferWhatsAppUrl(
        buildWhatsAppMessage(persistedOrder)
      );

      shoppingState.clearCart();
      checkoutForm.reset();
      renderSummary();
      syncHeaderCounters();

      // Ga rechtstreeks in hetzelfde tabblad naar WhatsApp.
      window.location.href = whatsappUrl;
    } catch (error) {
      console.error("Afrekenen mislukt:", error);
      showErrors([
        error?.message ||
          "Er ging iets mis bij het verwerken van de bestelling.",
      ]);
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
      showErrors([
        "Voorraad is gewijzigd sinds je producten toevoegde:",
        ...sync.warnings,
      ]);
    }
  } catch (error) {
    console.error("Voorraadsynchronisatie mislukt:", error);
  }

  renderSummary();
};

window.addEventListener("lootifer:state-updated", renderSummary);
window.addEventListener("lootifer:inventory-updated", initializeCheckout);

initializeCheckout();
