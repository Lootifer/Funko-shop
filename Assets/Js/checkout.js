import { createHeader } from "../../Components/Header.js";
import { createFooter } from "../../Components/Footer.js";
import { shoppingState } from "../../Components/Experience/shopping-state.js";
import { createShoppingUi, syncHeaderCounters } from "../../Components/Experience/shopping-ui.js";
import { formatCurrency, formatQuantity } from "./formatting.js";
import { createImageAttributes } from "../../Products/product-media.js";
import { getProductPriceLabel } from "../../Products/product-pricing.js";

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

const createOrderNumber = () => {
  const stamp = new Date();
  const datePart = `${stamp.getFullYear()}${String(stamp.getMonth() + 1).padStart(2, "0")}${String(stamp.getDate()).padStart(2, "0")}`;
  const timePart = String(stamp.getTime()).slice(-5);
  return `LOOT-${datePart}-${timePart}`;
};

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

  checkoutConfirmation.hidden = false;
  checkoutConfirmation.innerHTML = `
    <p class="order-number">Orderaanvraag ${order.number}</p>
    <h2>Bedankt, ${order.customer.name}.</h2>
    <p>Je orderaanvraag is ontvangen en wordt nu klaargezet voor handmatige afhandeling.</p>
    <p class="confirmation-note">Dit is een professionele testorder, geen online betaling. Een betaalprovider kan later worden toegevoegd zonder deze flow te wijzigen.</p>
    <div class="confirmation-note" style="margin-top: 1rem;">
      <strong>Leveringsmethode:</strong> ${order.deliveryMethod}<br />
      <strong>Totaal:</strong> ${formatCurrency(order.total)}<br />
      <strong>Status:</strong> ${order.status}
    </div>
    <div class="checkout-actions" style="justify-content: center;">
      <a class="button primary" href="shop.html">Verder winkelen</a>
      <a class="button secondary" href="cart.html">Bekijk winkelwagen</a>
    </div>
  `;
};

checkoutForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const values = getFormValues();
  const cart = shoppingState.getCart();
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
    status: "Orderaanvraag ontvangen",
    paymentStatus: "Nog geen online betaling",
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

  shoppingState.addOrder(order);
  shoppingState.clearCart();
  showConfirmation(order);
  checkoutForm.reset();
  renderSummary();
  syncHeaderCounters();
  window.scrollTo({ top: 0, behavior: "smooth" });
});

window.addEventListener("lootifer:state-updated", renderSummary);
renderSummary();