import { createAdminSidebar, createAdminTopbar, createFormCard } from "../components/layout.js";
import { requireAdminSession, wireAdminTopbar } from "./admin-auth.js";

const user = await requireAdminSession();
if (user) {
  document.getElementById("adminSidebar").innerHTML = createAdminSidebar("settings");
  document.getElementById("adminTopbar").innerHTML = createAdminTopbar("Instellingen");
  wireAdminTopbar(user);
  document.getElementById("productForm").innerHTML = createFormCard(
    "Winkelinstellingen",
    `
      <label>
        Winkelnaam
        <input value="2nd Life Toys" />
      </label>
      <label>
        Dropmodus
        <select>
          <option>Ingeschakeld</option>
          <option>Gepauzeerd</option>
        </select>
      </label>
      <label>
        Welkomstbericht
        <textarea rows="4">Premium verzamelervaring, klaar voor de volgende fase.</textarea>
      </label>
      <label>
        Standaardvaluta
        <input value="EUR" />
      </label>
    `
  );
}
