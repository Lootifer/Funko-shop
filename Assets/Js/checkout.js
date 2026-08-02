import { createHeader } from "../../Components/Header.js";
import { createFooter } from "../../Components/Footer.js";
import { shoppingState } from "../../Components/Experience/shopping-state.js";
import { createShoppingUi, syncHeaderCounters } from "../../Components/Experience/shopping-ui.js";
import { formatCurrency, formatQuantity } from "./formatting.js";
import { createImageAttributes } from "../../Products/product-media.js";
import { getProductPriceLabel } from "../../Products/product-pricing.js";
import { addOrder, createOrderNumber, synchronizeCartWithInventory } from "../../Components/Experience/order-inventory.js";

const headerRoot = document.getElementById("headerRoot");
const footerRoot = document.getElementById("footerRoot");
const checkoutForm = document.getElementById("checkoutForm");
const checkoutSummary = document.getElementById("checkoutSummary");
const checkoutMeta = document.getElementById("checkoutMeta");
const checkoutErrors = document.getElementById("checkoutErrors");
const checkoutConfirmation = document.getElementById("checkoutConfirmation");

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
  if (!values.postalCode?.trim() || !postalCodePattern.test(values.postalCode.trim())) errors.push("Postcode moet een geldig Nederlands formaat hebben.");
  if (!values.city?.trim()) errors.push("Plaats is verplicht.");
  if (!values.country?.trim()) errors.push("Land is verplicht.");
  if (!values.deliveryMethod?.trim()) errors.push("Kies een leveringsmethode.");
  if (checkoutForm && !checkoutForm.checkValidity()) {
    checkoutForm.reportValidity();
  }

  return errors;
};

const renderSummary = () => {
  const cart = shoppingState.getCart();
  const subtotal = shoppingState.getCartSubtotal();
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
      <div class="summary-line"><span>Subtotaal</span><strong>${formatCurrency(subtotal)}</strong></div>
      <div class="summary-line"><span>Verzending</span><strong>Nader te bepalen</strong></div>
      <div class="summary-total"><span>Totaal</span><strong>${formatCurrency(subtotal)}</strong></div>
    </div>
  `;
};

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

const showConfirmation = (order) => {
  if (!checkoutConfirmation) return;

  const itemRows = (order.items || [])
    .map((item) => `<li>${item.name} × ${formatQuantity(item.quantity)} - ${formatCurrency((Number(item.price) || 0) * (Number(item.quantity) || 0))}</li>`)
    .join("");

  const deliveryAddress = `${order.customer.street} ${order.customer.houseNumber}, ${order.customer.postalCode} ${order.customer.city}, ${order.customer.country}`;

  checkoutConfirmation.hidden = false;
  checkoutConfirmation.innerHTML = `
    <p class="order-number">Orderbevestiging ${order.number}</p>
    <h2>Bedankt, ${order.customer.name}.</h2>
    <p>Je orderaanvraag is ontvangen en wordt nu klaargezet voor handmatige afhandeling.</p>
    <p class="confirmation-note">Dit is een professionele testorder, geen online betaling. Een betaalprovider kan later worden toegevoegd zonder deze flow te wijzigen.</p>
    <div class="confirmation-note confirmation-grid" style="margin-top: 1rem; text-align: left;">
      <div><strong>Leveringsmethode:</strong><br />${order.deliveryMethod}</div>
      <div><strong>Status:</strong><br />${order.status}</div>
      <div><strong>Totaal:</strong><br />${formatCurrency(order.total)}</div>
      <div><strong>Testorder:</strong><br />Ja (lokaal opgeslagen)</div>
      <div><strong>Klant:</strong><br />${order.customer.name}<br />${order.customer.email}<br />${order.customer.phone}</div>
      <div><strong>Bezorgadres:</strong><br />${deliveryAddress}</div>
      ${order.notes ? `<div class="full-span"><strong>Notities:</strong><br />${order.notes}</div>` : ""}
      <div class="full-span"><strong>Producten:</strong><ul class="confirmation-items">${itemRows}</ul></div>
    </div>
    <div class="checkout-actions" style="justify-content: center;">
      <button class="button secondary" type="button" id="printConfirmationButton">Print bevestiging</button>
      <a class="button primary" href="shop.html">Terug naar winkel</a>
      <a class="button secondary" href="cart.html">Bekijk winkelwagen</a>
    </div>
  `;

  const printButton = document.getElementById("printConfirmationButton");
  printButton?.addEventListener("click", () => {
    window.print();
  });
};

checkoutForm?.addEventListener("submit", (event) => {
  const run = async () => {
    const sync = await synchronizeCartWithInventory();
    const cart = sync.cart;

    if (sync.warnings.length) {
      showErrors(["Voorraad is bijgewerkt voordat je bestelde:", ...sync.warnings]);
      renderSummary();
      return;
    }

    const values = getFormValues();
    const errors = validateForm(values, cart);

    if (errors.length) {
      showErrors(errors);
      return;
    }

    showErrors([]);

    const subtotal = shoppingState.getCartSubtotal();
    const deliveryMethodSelect = checkoutForm?.elements?.deliveryMethod;
    const deliveryMethodLabel = deliveryMethodSelect?.selectedOptions?.[0]?.textContent || values.deliveryMethod || "";
    const order = {
      id: Date.now(),
      number: createOrderNumber(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: "Nieuw",
      paymentStatus: "Nog geen online betaling",
      isTestOrder: true,
      stockRestoredAt: null,
      deliveryMethod: deliveryMethodLabel,
      total: subtotal,
      subtotal,
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

    const persistedOrder = await addOrder(order);
    shoppingState.clearCart();
    showConfirmation(persistedOrder);
    checkoutForm.reset();
    renderSummary();
    syncHeaderCounters();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  event.preventDefault();

  run().catch((error) => {
    console.error("Afrekenen mislukt:", error);
    showErrors(["Er ging iets mis bij het verwerken van de bestelling."]);
  });
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