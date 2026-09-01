import { createAdminSidebar, createAdminTopbar } from "../components/layout.js";
import { requireAdminSession, wireAdminTopbar } from "./admin-auth.js";

const DEFAULT_API_HOST = window.location?.hostname || "localhost";
const API_BASE = window.LOOTIFER_API_BASE
  ? String(window.LOOTIFER_API_BASE).replace(/\/$/, "")
  : `http://${DEFAULT_API_HOST}:3001/api`;
const displayManager = document.getElementById("displayManager");
const highlightManager = document.getElementById("highlightManager");
const displayStatus = document.getElementById("displayStatus");
const highlightStatus = document.getElementById("highlightStatus");
const displayButton = document.getElementById("saveDisplayButton");
const highlightsButton = document.getElementById("saveHighlightsButton");

let settings = { display: Array.from({ length: 3 }, () => ({ image: "" })), highlights: Array.from({ length: 6 }, () => ({ productId: null, image: "" })) };
let products = [];
let busyUploads = 0;

const request = async (path, options = {}) => {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const text = await response.text();
  let body = {};
  try { body = text ? JSON.parse(text) : {}; } catch { body = {}; }
  if (!response.ok) {
    if (response.status === 401) throw new Error("Je admin-sessie is verlopen. Log opnieuw in.");
    if (response.status === 413) throw new Error("De foto is te groot. Kies een kleinere JPG/PNG/WebP-foto.");
    throw new Error(body?.error || body?.details || `API ${response.status}`);
  }
  return body;
};

const fileToDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result || ""));
  reader.onerror = () => reject(reader.error || new Error("Foto kon niet worden gelezen."));
  reader.readAsDataURL(file);
});

const uploadHomepageImage = async (file, section, slot) => {
  if (!file) return "";
  const allowed = /\.(jpe?g|png|webp)$/i.test(file.name) || ["image/jpeg", "image/png", "image/webp"].includes(String(file.type || "").toLowerCase());
  if (!allowed) throw new Error("Alleen JPG, PNG en WebP zijn toegestaan.");
  const dataUrl = await fileToDataUrl(file);
  const result = await request("/site/homepage-media", {
    method: "POST",
    body: JSON.stringify({ section, slot, dataUrl, name: file.name }),
  });
  return result.image || "";
};

const saveSettings = async () => {
  settings = await request("/site/homepage", { method: "PUT", body: JSON.stringify(settings) });
  return settings;
};

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const CATEGORY_ORDER = [
  "Funko Pop",
  "Funko Movies",
  "Funko Television",
  "Funko Animation",
  "Funko Games",
  "Funko Heroes",
  "Funko Bitty Pop",
  "Funko Pin",
  "Funko Tee",
  "LEGO",
  "Pokémon",
  "Star Wars",
  "Harry Potter",
  "Collectible Lamps",
  "Figures & Toys",
  "Vintage Figures",
  "Hot Wheels",
];

const getProductGroup = (product = {}) => {
  const category = String(product.category || "").trim();
  if (category) return category;

  const brand = String(product.brand || "").trim();
  if (brand) return brand;

  return "Overig";
};

const productOptions = (selected) => {
  const grouped = new Map();

  products
    .filter((product) => !product.archived)
    .forEach((product) => {
      const group = getProductGroup(product);
      if (!grouped.has(group)) grouped.set(group, []);
      grouped.get(group).push(product);
    });

  const groups = [...grouped.entries()].sort(([groupA], [groupB]) => {
    const indexA = CATEGORY_ORDER.indexOf(groupA);
    const indexB = CATEGORY_ORDER.indexOf(groupB);

    if (indexA !== -1 || indexB !== -1) {
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    }

    return groupA.localeCompare(groupB, "nl", { sensitivity: "base" });
  });

  const options = ['<option value="">Geen product / leeg vak</option>'];

  groups.forEach(([group, groupProducts]) => {
    options.push(`<optgroup label="${escapeHtml(group)}">`);

    groupProducts
      .sort((a, b) =>
        String(a.name || "").localeCompare(String(b.name || ""), "nl", {
          sensitivity: "base",
        })
      )
      .forEach((product) => {
        const label = `${product.name || "Naamloos product"}${
          product.number ? ` ${product.number}` : ""
        }`;

        options.push(
          `<option value="${escapeHtml(product.id)}" ${
            Number(selected) === Number(product.id) ? "selected" : ""
          }>${escapeHtml(label)}</option>`
        );
      });

    options.push("</optgroup>");
  });

  return options.join("");
};

const toPreviewSrc = (value = "") => {
  const clean = String(value || "").trim();
  if (!clean) return "";
  if (/^https?:\/\//i.test(clean) || clean.startsWith("../")) return clean;
  return `../${clean}`;
};

const setBusy = (busy) => {
  busyUploads += busy ? 1 : -1;
  busyUploads = Math.max(0, busyUploads);
  if (displayButton) displayButton.disabled = busyUploads > 0;
  if (highlightsButton) highlightsButton.disabled = busyUploads > 0;
};

const uploadDisplayFile = async (input) => {
  const index = Number(input.dataset.displayFile);
  const file = input.files?.[0];
  if (!file) return;
  setBusy(true);
  if (displayStatus) displayStatus.textContent = `Foto ${index + 1} uploaden…`;
  try {
    settings.display[index] = { image: await uploadHomepageImage(file, "display", index + 1) };
    await saveSettings();
    if (displayStatus) displayStatus.textContent = `Displayfoto ${index + 1} geüpload en opgeslagen.`;
    render();
  } catch (error) {
    if (displayStatus) displayStatus.textContent = error.message || "Upload mislukt.";
  } finally {
    setBusy(false);
  }
};

const uploadHighlightFile = async (input) => {
  const index = Number(input.dataset.highlightFile);
  const file = input.files?.[0];
  if (!file) return;
  setBusy(true);
  if (highlightStatus) highlightStatus.textContent = `Highlightfoto ${index + 1} uploaden…`;
  try {
    const productId = Number(document.querySelector(`[data-highlight-product="${index}"]`)?.value) || settings.highlights[index]?.productId || null;
    const image = await uploadHomepageImage(file, "highlight", index + 1);
    settings.highlights[index] = { productId, image };
    await saveSettings();
    if (highlightStatus) highlightStatus.textContent = `Highlightfoto ${index + 1} geüpload en opgeslagen.`;
    render();
  } catch (error) {
    if (highlightStatus) highlightStatus.textContent = error.message || "Upload mislukt.";
  } finally {
    setBusy(false);
  }
};

const bindRenderedControls = () => {
  document.querySelectorAll("[data-display-file]").forEach((input) => {
    input.addEventListener("change", () => uploadDisplayFile(input));
  });
  document.querySelectorAll("[data-highlight-file]").forEach((input) => {
    input.addEventListener("change", () => uploadHighlightFile(input));
  });
  document.querySelectorAll("[data-highlight-product]").forEach((select) => {
    select.addEventListener("change", async () => {
      const index = Number(select.dataset.highlightProduct);
      settings.highlights[index] = { ...settings.highlights[index], productId: Number(select.value) || null };
      if (highlightStatus) highlightStatus.textContent = "Productkeuze opslaan…";
      try {
        await saveSettings();
        if (highlightStatus) highlightStatus.textContent = "Productkeuze opgeslagen.";
        render();
      } catch (error) {
        if (highlightStatus) highlightStatus.textContent = error.message || "Opslaan mislukt.";
      }
    });
  });
  document.querySelectorAll("[data-clear-display]").forEach((button) => button.addEventListener("click", async () => {
    const index = Number(button.dataset.clearDisplay);
    settings.display[index] = { image: "" };
    try { await saveSettings(); } catch (error) { if (displayStatus) displayStatus.textContent = error.message; }
    render();
  }));
  document.querySelectorAll("[data-clear-highlight-image]").forEach((button) => button.addEventListener("click", async () => {
    const index = Number(button.dataset.clearHighlightImage);
    settings.highlights[index] = { ...settings.highlights[index], image: "" };
    try { await saveSettings(); } catch (error) { if (highlightStatus) highlightStatus.textContent = error.message; }
    render();
  }));
};

const render = () => {
  displayManager.innerHTML = Array.from({ length: 3 }, (_, index) => {
    const current = settings.display[index]?.image || "";
    return `
      <article class="admin-home-slot">
        <span class="admin-home-slot-number">0${index + 1}</span>
        <div class="admin-home-preview">${current ? `<img src="${toPreviewSrc(current)}" alt="Display ${index + 1}">` : '<span>Geen foto</span>'}</div>
        <label class="button primary admin-file-button">Kies JPG/PNG/WebP<input type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" data-display-file="${index}" hidden></label>
        <button class="button secondary" type="button" data-clear-display="${index}">Leegmaken</button>
      </article>`;
  }).join("");

  highlightManager.innerHTML = Array.from({ length: 6 }, (_, index) => {
    const current = settings.highlights[index] || {};
    const product = products.find((item) => Number(item.id) === Number(current.productId));
    const previewImage = current.image || product?.image || product?.thumbnail || "";
    return `
      <article class="admin-home-slot">
        <span class="admin-home-slot-number">0${index + 1}</span>
        <div class="admin-home-preview">${previewImage ? `<img src="${toPreviewSrc(previewImage)}" alt="Highlight ${index + 1}">` : '<span>Geen foto</span>'}</div>
        <label>Product<select data-highlight-product="${index}">${productOptions(current.productId)}</select></label>
        <label class="button primary admin-file-button">Kies andere foto<input type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" data-highlight-file="${index}" hidden></label>
        <button class="button secondary" type="button" data-clear-highlight-image="${index}">Eigen foto wissen</button>
      </article>`;
  }).join("");

  bindRenderedControls();
};

const load = async () => {
  document.getElementById("adminSidebar").innerHTML = createAdminSidebar("homepage");
  document.getElementById("adminTopbar").innerHTML = createAdminTopbar("Homepage beheren");
  const user = await requireAdminSession();
  if (!user) return;
  wireAdminTopbar(user);
  const [loadedSettings, productPayload] = await Promise.all([
    request("/site/homepage"),
    request("/products"),
  ]);
  settings = loadedSettings;
  products = Array.isArray(productPayload.products) ? productPayload.products : [];
  render();
};

displayButton?.addEventListener("click", async () => {
  displayButton.disabled = true;
  if (displayStatus) displayStatus.textContent = "Display wordt opgeslagen…";
  try {
    await saveSettings();
    if (displayStatus) displayStatus.textContent = "Display opgeslagen.";
    render();
  } catch (error) {
    if (displayStatus) displayStatus.textContent = error.message;
  } finally {
    displayButton.disabled = false;
  }
});

highlightsButton?.addEventListener("click", async () => {
  highlightsButton.disabled = true;
  if (highlightStatus) highlightStatus.textContent = "Highlights worden opgeslagen…";
  try {
    document.querySelectorAll("[data-highlight-product]").forEach((select) => {
      const index = Number(select.dataset.highlightProduct);
      settings.highlights[index] = { ...settings.highlights[index], productId: Number(select.value) || null };
    });
    await saveSettings();
    if (highlightStatus) highlightStatus.textContent = "Highlights opgeslagen.";
    render();
  } catch (error) {
    if (highlightStatus) highlightStatus.textContent = error.message;
  } finally {
    highlightsButton.disabled = false;
  }
});

load().catch((error) => {
  if (displayStatus) displayStatus.textContent = error.message || "Homepagebeheer kon niet worden geladen.";
});
