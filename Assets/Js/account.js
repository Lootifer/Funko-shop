import { createHeader } from "../../Components/Header.js";
import { createFooter } from "../../Components/Footer.js";
import { createShoppingUi } from "../../Components/Experience/shopping-ui.js";

const headerRoot = document.getElementById("headerRoot");
const footerRoot = document.getElementById("footerRoot");

if (headerRoot) headerRoot.innerHTML = createHeader("account");
if (footerRoot) footerRoot.innerHTML = createFooter();

const shoppingRoot = document.createElement("div");
shoppingRoot.id = "shoppingRoot";
document.body.appendChild(shoppingRoot);
createShoppingUi({ root: shoppingRoot });

const notConnectedMessage =
  "De accountfunctie wordt in de volgende stap veilig aan de server gekoppeld. Er zijn nu geen gegevens verstuurd of opgeslagen.";

document.querySelectorAll("[data-account-demo-form]").forEach((form) => {
  form.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    if (form.dataset.accountDemoForm === "register") {
      const password = form.querySelector('[name="password"]')?.value || "";
      const repeat = form.querySelector('[name="passwordRepeat"]')?.value || "";
      if (password !== repeat) {
        const status = form.querySelector(".account-form-status");
        if (status) {
          status.hidden = false;
          status.textContent = "De twee wachtwoorden zijn niet gelijk.";
        }
        return;
      }
    }

    const status = form.querySelector(".account-form-status");
    if (status) {
      status.hidden = false;
      status.textContent = notConnectedMessage;
    }
  });
});

document.querySelectorAll("[data-account-not-ready]").forEach((button) => {
  button.addEventListener("click", () => {
    const form = button.closest("form");
    const status = form?.querySelector(".account-form-status");
    if (status) {
      status.hidden = false;
      status.textContent = `${button.dataset.accountNotReady} wordt tegelijk met de beveiligde accountserver aangesloten.`;
    }
  });
});

const focusHashSection = () => {
  const hash = window.location.hash;
  if (!["#login", "#register"].includes(hash)) return;
  const section = document.querySelector(hash);
  if (!section) return;
  requestAnimationFrame(() => {
    section.scrollIntoView({ behavior: "smooth", block: "center" });
    section.classList.add("is-targeted");
    window.setTimeout(() => section.classList.remove("is-targeted"), 1600);
  });
};

window.addEventListener("hashchange", focusHashSection);
focusHashSection();
