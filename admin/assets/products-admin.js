import { createAdminSidebar, createAdminTopbar } from "../components/layout.js";
import { createProductCard } from "../../Components/ProductCard.js";
import { normalizeProductCatalog } from "../../Products/product-schema.js";
import { loadFileProductCatalog, loadProductCatalog, saveProductCatalog, clearSavedCatalog } from "./product-admin-state.js";
import {
  buildAutoSlug,
  buildDraftFromForm,
  buildProductForSave,
  getMappedImagesForSlug,
  parseImagesInput,
  validateDraft,
  getProductCompleteness,
  getCanonicalImageInfo,
} from "./product-admin-utils.js";

const euro = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" });
const escapeHtml = (value = "") => String(value)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/\"/g, "&quot;")
  .replace(/'/g, "&#39;");

const toAdminAssetPath = (value = "") => {
  const text = String(value || "").trim();
  if (!text) return "";

  return text
    .split("|")
    .map((candidate) => {
      const clean = candidate.trim();
      if (!clean) return "";
      if (/^https?:\/\//i.test(clean)) return clean;
      if (clean.startsWith("../")) return clean;
      if (clean.startsWith("Assets/")) return `../${clean}`;
      return clean;
    })
    .filter(Boolean)
    .join("|");
};

const mapProductMediaForAdmin = (product = {}) => {
  const images = Array.isArray(product.images) ? product.images.map(toAdminAssetPath) : [];
  return {
    ...product,
    image: toAdminAssetPath(product.image),
    thumbnail: toAdminAssetPath(product.thumbnail),
    boxFront: toAdminAssetPath(product.boxFront),
    boxBack: toAdminAssetPath(product.boxBack),
    leftSide: toAdminAssetPath(product.leftSide),
    rightSide: toAdminAssetPath(product.rightSide),
    images,
    gallery: Array.isArray(product.gallery) ? product.gallery.map(toAdminAssetPath) : images,
  };
};

const root = {
  sidebar: document.getElementById("adminSidebar"),
  topbar: document.getElementById("adminTopbar"),
  form: document.getElementById("productForm"),
  errors: document.getElementById("productErrors"),
  status: document.getElementById("productStatus"),
  table: document.getElementById("productTable"),
  preview: document.getElementById("productLivePreview"),
  mode: document.getElementById("formModeLabel"),
  submit: document.getElementById("saveProductButton"),
  cancel: document.getElementById("cancelEditButton"),
  resetData: document.getElementById("resetCatalogButton"),
  autoLink: document.getElementById("autoLinkImagesButton"),
  imageSource: document.getElementById("imageSourceHint"),
  slugReset: document.getElementById("resetSlugButton"),
  canonicalHint: document.getElementById("canonicalImageHint"),
  search: document.getElementById("tableSearch"),
  universeFilter: document.getElementById("tableUniverseFilter"),
  franchiseFilter: document.getElementById("tableFranchiseFilter"),
  stockFilter: document.getElementById("tableStockFilter"),
  missingFilter: document.getElementById("tableMissingFilter"),
  archiveFilter: document.getElementById("tableArchiveFilter"),
  tableResultHint: document.getElementById("tableResultHint"),
  exportButton: document.getElementById("exportCatalogButton"),
  importButton: document.getElementById("importCatalogButton"),
  importInput: document.getElementById("importCatalogInput"),
  importPreview: document.getElementById("importPreview"),
  completenessStats: document.getElementById("productCompletenessStats"),
};

const fields = {
  id: document.getElementById("fieldId"),
  name: document.getElementById("fieldName"),
  number: document.getElementById("fieldNumber"),
  slug: document.getElementById("fieldSlug"),
  sku: document.getElementById("fieldSku"),
  barcode: document.getElementById("fieldBarcode"),
  category: document.getElementById("fieldCategory"),
  brand: document.getElementById("fieldBrand"),
  universe: document.getElementById("fieldUniverse"),
  franchise: document.getElementById("fieldFranchise"),
  edition: document.getElementById("fieldEdition"),
  variant: document.getElementById("fieldVariant"),
  releaseYear: document.getElementById("fieldReleaseYear"),
  condition: document.getElementById("fieldCondition"),
  boxCondition: document.getElementById("fieldBoxCondition"),
  warehouseLocation: document.getElementById("fieldWarehouseLocation"),
  purchasePrice: document.getElementById("fieldPurchasePrice"),
  sellingPrice: document.getElementById("fieldSellingPrice"),
  discountPrice: document.getElementById("fieldDiscountPrice"),
  stock: document.getElementById("fieldStock"),
  reserved: document.getElementById("fieldReserved"),
  tags: document.getElementById("fieldTags"),
  description: document.getElementById("fieldDescription"),
  images: document.getElementById("fieldImages"),
  exclusive: document.getElementById("fieldExclusive"),
  chase: document.getElementById("fieldChase"),
  vaulted: document.getElementById("fieldVaulted"),
  signed: document.getElementById("fieldSigned"),
  protectorIncluded: document.getElementById("fieldProtectorIncluded"),
};

const state = {
  products: [],
  editingId: null,
  slugTouched: false,
  autoLinkedImages: [],
  importPreviewProducts: null,
};

const readFormData = () => {
  return Object.fromEntries(
    Object.entries(fields).map(([key, element]) => {
      if (!element) return [key, ""];
      if (element.type === "checkbox") return [key, element.checked];
      return [key, element.value];
    })
  );
};

const setStatus = (message, tone = "muted") => {
  if (!root.status) return;
  root.status.textContent = message;
  root.status.dataset.tone = tone;
};

const setErrors = (errors = []) => {
  if (!root.errors) return;
  if (!errors.length) {
    root.errors.innerHTML = "";
    root.errors.style.display = "none";
    return;
  }

  root.errors.style.display = "block";
  root.errors.innerHTML = `<ul>${errors.map((error) => `<li>${escapeHtml(error)}</li>`).join("")}</ul>`;
};

const withAdminDefaults = (product = {}) => ({
  ...product,
  archived: Boolean(product.archived),
  reserved: Number(product.reserved) || 0,
});

const setProducts = (products = []) => {
  state.products = normalizeProductCatalog(products).map(withAdminDefaults);
};

const persistProducts = () => {
  saveProductCatalog(state.products);
};

const nextId = () => {
  const ids = state.products.map((product) => Number(product.id) || 0);
  return Math.max(0, ...ids) + 1;
};

const buildUniqueField = (seed, takenSet) => {
  let candidate = String(seed || "").trim();
  if (!candidate) candidate = "item";
  let suffix = 2;
  while (takenSet.has(candidate.toLowerCase())) {
    candidate = `${seed}-kopie-${suffix}`;
    suffix += 1;
  }
  return candidate;
};

const setFormMode = (editing) => {
  if (root.mode) root.mode.textContent = editing ? "Product bewerken" : "Product toevoegen";
  if (root.submit) root.submit.textContent = editing ? "Product bijwerken" : "Product opslaan";
  if (root.cancel) root.cancel.style.display = editing ? "inline-flex" : "none";
};

const fillSelect = (element, values = [], placeholder = "Alles") => {
  if (!element) return;
  const previous = element.value;
  element.innerHTML = `<option value="">${placeholder}</option>${values.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join("")}`;
  if (values.includes(previous)) {
    element.value = previous;
  }
};

const renderCompletenessStats = () => {
  if (!root.completenessStats) return;
  const active = state.products.filter((product) => !product.archived);
  const complete = active.filter((product) => getProductCompleteness(product).complete).length;
  const incomplete = active.length - complete;

  root.completenessStats.innerHTML = `
    <article class="admin-mini-stat">
      <p class="admin-label">Actieve producten</p>
      <strong>${active.length}</strong>
    </article>
    <article class="admin-mini-stat success">
      <p class="admin-label">Volledig</p>
      <strong>${complete}</strong>
    </article>
    <article class="admin-mini-stat warning">
      <p class="admin-label">Onvolledig</p>
      <strong>${incomplete}</strong>
    </article>
  `;
};

const renderFilterOptions = () => {
  const universes = [...new Set(state.products.map((item) => item.universe).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const franchises = [...new Set(state.products.map((item) => item.franchise).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  fillSelect(root.universeFilter, universes, "Alle universums");
  fillSelect(root.franchiseFilter, franchises, "Alle franchises");
};

const stockStatus = (product = {}) => {
  const stock = Number(product.stock) || 0;
  if (product.archived) return { label: "Gearchiveerd", tone: "muted" };
  if (stock <= 0) return { label: "Niet op voorraad", tone: "danger" };
  if (stock <= 2) return { label: "Lage voorraad", tone: "warning" };
  return { label: "Actief", tone: "success" };
};

const hasMissingByFilter = (product, filter) => {
  const completeness = getProductCompleteness(product);
  if (!filter) return true;
  if (filter === "any") return !completeness.complete;
  if (filter === "price") return completeness.missing.includes("prijs");
  if (filter === "barcode") return completeness.missing.includes("barcode");
  if (filter === "releaseYear") return completeness.missing.includes("uitgavejaar");
  if (filter === "description") return completeness.missing.includes("beschrijving");
  if (filter === "photos") return completeness.missing.includes("foto's");
  return true;
};

const matchesFilters = (product) => {
  const query = (root.search?.value || "").trim().toLowerCase();
  const universe = root.universeFilter?.value || "";
  const franchise = root.franchiseFilter?.value || "";
  const stock = root.stockFilter?.value || "";
  const missing = root.missingFilter?.value || "";
  const archive = root.archiveFilter?.value || "active";

  if (archive === "active" && product.archived) return false;
  if (archive === "archived" && !product.archived) return false;

  if (query) {
    const haystack = `${product.name} ${product.slug} ${product.sku} ${product.barcode} ${product.number}`.toLowerCase();
    if (!haystack.includes(query)) return false;
  }

  if (universe && product.universe !== universe) return false;
  if (franchise && product.franchise !== franchise) return false;

  const currentStock = Number(product.stock) || 0;
  if (stock === "in-stock" && currentStock <= 0) return false;
  if (stock === "low-stock" && (currentStock <= 0 || currentStock > 2)) return false;
  if (stock === "out-of-stock" && currentStock > 0) return false;

  if (!hasMissingByFilter(product, missing)) return false;

  return true;
};

const updateTableHint = (visibleCount) => {
  if (!root.tableResultHint) return;
  root.tableResultHint.textContent = `${visibleCount} product${visibleCount === 1 ? "" : "en"} zichtbaar.`;
};

const updateCanonicalHint = () => {
  if (!root.canonicalHint) return;
  const draft = buildDraftFromForm(readFormData());
  const canonical = getCanonicalImageInfo(draft);
  root.canonicalHint.innerHTML = `
    <p class="admin-detail"><strong>Verwachte map:</strong> ${escapeHtml(canonical.folder)}</p>
    <ul>
      ${canonical.paths.map((path) => `<li>${escapeHtml(path)}</li>`).join("")}
    </ul>
  `;
};

const resetImportPreview = () => {
  state.importPreviewProducts = null;
  if (!root.importPreview) return;
  root.importPreview.innerHTML = "";
  root.importPreview.style.display = "none";
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

const renderImportPreview = (products) => {
  if (!root.importPreview) return;
  const normalized = normalizeProductCatalog(products).map(withAdminDefaults);
  const incomplete = normalized.filter((product) => !getProductCompleteness(product).complete).length;

  root.importPreview.style.display = "block";
  root.importPreview.innerHTML = `
    <h4>Importvoorbeeld</h4>
    <p class="admin-detail">${normalized.length} producten gevonden. ${incomplete} onvolledig.</p>
    <div class="admin-form-actions">
      <button class="button primary" type="button" id="applyImportButton">Import toepassen</button>
      <button class="button secondary" type="button" id="cancelImportButton">Annuleren</button>
    </div>
  `;

  const applyButton = document.getElementById("applyImportButton");
  const cancelButton = document.getElementById("cancelImportButton");

  applyButton?.addEventListener("click", () => {
    const confirmed = window.confirm("Weet je zeker dat je de huidige lokale catalogus wilt vervangen met deze import?");
    if (!confirmed) return;

    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    downloadJson(state.products, `producten-backup-${stamp}.json`);

    setProducts(products);
    persistProducts();
    renderFilterOptions();
    renderTable();
    renderCompletenessStats();
    resetImportPreview();
    setStatus("Import succesvol toegepast. Er is eerst een back-up gedownload.", "accent");
  });

  cancelButton?.addEventListener("click", () => {
    resetImportPreview();
    setStatus("Import geannuleerd.", "muted");
  });
};

const applyFormValues = (product) => {
  fields.id.value = String(product.id || "");
  fields.name.value = product.name || "";
  fields.number.value = product.number || "";
  fields.slug.value = product.slug || "";
  fields.sku.value = product.sku || "";
  fields.barcode.value = product.barcode || "";
  fields.category.value = product.category || "Funko Pop";
  fields.brand.value = product.brand || "";
  fields.universe.value = product.universe || "";
  fields.franchise.value = product.franchise || "";
  fields.edition.value = product.edition || "Standard";
  fields.variant.value = product.variant || "Standard";
  fields.releaseYear.value = product.releaseYear ? String(product.releaseYear) : "";
  fields.condition.value = product.condition || "Mint";
  fields.boxCondition.value = product.boxCondition || "Mint";
  fields.warehouseLocation.value = product.warehouseLocation || "";
  fields.purchasePrice.value = String(product.purchasePrice ?? 0);
  fields.sellingPrice.value = String(product.sellingPrice ?? product.price ?? 0);
  fields.discountPrice.value = product.discountPrice ?? "";
  fields.stock.value = String(product.stock ?? 0);
  fields.reserved.value = String(product.reserved ?? 0);
  fields.tags.value = Array.isArray(product.tags) ? product.tags.join(", ") : "";
  fields.description.value = product.description || "";
  fields.images.value = Array.isArray(product.images) ? product.images.join("\n") : "";
  fields.exclusive.checked = Boolean(product.exclusive);
  fields.chase.checked = Boolean(product.chase);
  fields.vaulted.checked = Boolean(product.vaulted);
  fields.signed.checked = Boolean(product.signed);
  fields.protectorIncluded.checked = Boolean(product.protectorIncluded);
};

const resetForm = () => {
  root.form?.reset();
  fields.id.value = String(nextId());
  if (fields.releaseYear) fields.releaseYear.value = String(new Date().getFullYear());
  if (fields.stock) fields.stock.value = "0";
  if (fields.sellingPrice) fields.sellingPrice.value = "0";
  if (fields.purchasePrice) fields.purchasePrice.value = "0";
  if (fields.reserved) fields.reserved.value = "0";
  if (fields.slug) fields.slug.value = "";
  if (fields.category) fields.category.value = "Funko Pop";
  if (fields.brand) fields.brand.value = "Funko";
  if (fields.condition) fields.condition.value = "Mint";
  if (fields.boxCondition) fields.boxCondition.value = "Mint";
  if (fields.edition) fields.edition.value = "Standard";
  if (fields.variant) fields.variant.value = "Standard";

  state.editingId = null;
  state.slugTouched = false;
  state.autoLinkedImages = [];

  setFormMode(false);
  setErrors([]);
  setStatus("Klaar om een product toe te voegen.", "muted");
  if (root.imageSource) root.imageSource.textContent = "Afbeeldingen: handmatig invoeren of automatisch koppelen via slug.";

  updateAutoSlug();
  updateCanonicalHint();
  renderPreview();
};

const renderPreview = () => {
  if (!root.preview) return;
  const draft = buildDraftFromForm(readFormData());
  const previewProduct = buildProductForSave({ draft, autoLinkedImages: state.autoLinkedImages });
  root.preview.innerHTML = createProductCard(mapProductMediaForAdmin(previewProduct));
};

const updateAutoSlug = () => {
  if (state.slugTouched) return;
  fields.slug.value = buildAutoSlug({
    name: fields.name.value,
    number: fields.number.value,
  });
};

const linkImagesBySlug = async () => {
  const slug = String(fields.slug.value || "").trim();
  if (!slug) {
    state.autoLinkedImages = [];
    if (root.imageSource) root.imageSource.textContent = "Afbeeldingen: vul eerst naam/nummer in voor een slug.";
    renderPreview();
    return;
  }

  const linked = await getMappedImagesForSlug({
    slug,
    category: fields.category.value,
    brand: fields.brand.value,
  });

  state.autoLinkedImages = linked;
  if (linked.length) {
    fields.images.value = linked.join("\n");
    if (root.imageSource) root.imageSource.textContent = `Afbeeldingen automatisch gekoppeld (${linked.length} gevonden).`;
  } else if (root.imageSource) {
    root.imageSource.textContent = "Geen afbeeldingen gevonden voor deze slugmap. Handmatige paden of placeholder worden gebruikt.";
  }

  renderPreview();
};

const duplicateProduct = (product) => {
  const id = nextId();
  const slugSet = new Set(state.products.map((item) => String(item.slug || "").toLowerCase()));
  const skuSet = new Set(state.products.map((item) => String(item.sku || "").toLowerCase()));
  const slugSeed = `${product.slug || "product"}-kopie`;
  const skuSeed = `${product.sku || "SKU"}-KOPIE`;

  const copy = {
    ...product,
    id,
    slug: buildUniqueField(slugSeed, slugSet),
    sku: buildUniqueField(skuSeed, skuSet),
    archived: false,
    stock: Number(product.stock) || 0,
    reserved: Number(product.reserved) || 0,
  };

  state.products = [...state.products, copy].map(withAdminDefaults);
  persistProducts();
  renderFilterOptions();
  renderTable();
  renderCompletenessStats();
  setStatus(`${copy.name} is gedupliceerd.`, "accent");
};

const setProductArchived = (id, archived) => {
  state.products = state.products.map((item) => (Number(item.id) === Number(id) ? { ...item, archived } : item));
  persistProducts();
  renderTable();
  renderCompletenessStats();
};

const adjustStock = (id, delta) => {
  state.products = state.products.map((item) => {
    if (Number(item.id) !== Number(id)) return item;
    const nextStock = Math.max(0, (Number(item.stock) || 0) + delta);
    return { ...item, stock: nextStock };
  });
  persistProducts();
  renderTable();
  renderCompletenessStats();
};

const renderTable = () => {
  if (!root.table) return;

  const visibleProducts = state.products.filter(matchesFilters).sort((a, b) => Number(a.id) - Number(b.id));
  updateTableHint(visibleProducts.length);

  const rows = visibleProducts.map((product) => {
    const status = stockStatus(product);
    const completeness = getProductCompleteness(product);
    const missingLabel = completeness.complete ? "Volledig" : `Mist: ${completeness.missing.join(", ")}`;
    const image = Array.isArray(product.images) && product.images.length ? product.images[0] : product.thumbnail;
    const tableImage = toAdminAssetPath(String(image || "").split("|")[0]);

    return `
      <tr class="${product.archived ? "is-archived" : ""}">
        <td>
          <img class="admin-thumb" src="${escapeHtml(tableImage || "")}" alt="${escapeHtml(product.name || "Product")}" />
        </td>
        <td>
          <strong>${escapeHtml(product.name || "-")}</strong>
          <div class="admin-subline">${escapeHtml(product.number || "-")}</div>
          <div class="admin-subline">ID ${Number(product.id) || 0}</div>
        </td>
        <td>${euro.format(Number(product.sellingPrice) || 0)}</td>
        <td>
          <div class="admin-stock-controls">
            <button type="button" class="button secondary" data-stock-minus="${product.id}">−</button>
            <strong>${Number(product.stock) || 0}</strong>
            <button type="button" class="button secondary" data-stock-plus="${product.id}">+</button>
          </div>
          <div class="admin-subline">Gereserveerd: ${Number(product.reserved) || 0}</div>
        </td>
        <td>
          <span class="admin-badge ${status.tone}">${status.label}</span>
          <div class="admin-subline">${escapeHtml(missingLabel)}</div>
        </td>
        <td>
          <div class="admin-row-actions">
            <button class="button secondary" type="button" data-edit-id="${product.id}">Bewerken</button>
            <button class="button secondary" type="button" data-duplicate-id="${product.id}">Dupliceren</button>
            <button class="button secondary" type="button" data-archive-id="${product.id}" data-archive-state="${product.archived ? "0" : "1"}">${product.archived ? "Herstellen" : "Archiveren"}</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");

  root.table.innerHTML = `
    <div class="admin-card admin-table-wrap">
      <table class="admin-table">
        <thead>
          <tr>
            <th>Afbeelding</th>
            <th>Product</th>
            <th>Verkoopprijs</th>
            <th>Voorraad</th>
            <th>Status</th>
            <th>Acties</th>
          </tr>
        </thead>
        <tbody>
          ${rows || '<tr><td colspan="6">Geen producten gevonden voor deze filters.</td></tr>'}
        </tbody>
      </table>
    </div>
  `;

  root.table.querySelectorAll("[data-edit-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = Number(button.dataset.editId || 0);
      const product = state.products.find((item) => Number(item.id) === id);
      if (!product) return;

      applyFormValues(product);
      state.editingId = id;
      state.slugTouched = true;
      state.autoLinkedImages = parseImagesInput(fields.images.value);
      setFormMode(true);
      setStatus(`${product.name} wordt bewerkt.`, "accent");
      updateCanonicalHint();
      renderPreview();
      root.form?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  root.table.querySelectorAll("[data-duplicate-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = Number(button.dataset.duplicateId || 0);
      const product = state.products.find((item) => Number(item.id) === id);
      if (!product) return;
      duplicateProduct(product);
    });
  });

  root.table.querySelectorAll("[data-archive-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = Number(button.dataset.archiveId || 0);
      const archiveNext = button.dataset.archiveState === "1";
      setProductArchived(id, archiveNext);
      const product = state.products.find((item) => Number(item.id) === id);
      if (product) {
        setStatus(`${product.name} is ${archiveNext ? "gearchiveerd" : "hersteld"}.`, "accent");
      }
    });
  });

  root.table.querySelectorAll("[data-stock-plus]").forEach((button) => {
    button.addEventListener("click", () => {
      adjustStock(Number(button.dataset.stockPlus || 0), 1);
    });
  });

  root.table.querySelectorAll("[data-stock-minus]").forEach((button) => {
    button.addEventListener("click", () => {
      adjustStock(Number(button.dataset.stockMinus || 0), -1);
    });
  });
};

const saveProduct = async (event) => {
  event.preventDefault();

  const formData = readFormData();
  const draft = buildDraftFromForm(formData);
  const editingId = state.editingId;

  const validation = validateDraft({ draft, products: state.products, editingId });
  if (!validation.valid) {
    setErrors(validation.errors);
    setStatus("Los de validatiefouten op voordat je opslaat.", "error");
    return;
  }

  if (!state.autoLinkedImages.length && !parseImagesInput(formData.images).length) {
    await linkImagesBySlug();
  }

  const existingProduct = editingId === null
    ? null
    : state.products.find((item) => Number(item.id) === Number(editingId)) || null;

  const savedProduct = buildProductForSave({
    draft,
    existingProduct,
    autoLinkedImages: state.autoLinkedImages,
  });

  const nextProducts = editingId === null
    ? [...state.products, savedProduct]
    : state.products.map((item) => (Number(item.id) === Number(editingId) ? { ...savedProduct, archived: item.archived } : item));

  setProducts(nextProducts);
  persistProducts();

  renderFilterOptions();
  renderTable();
  renderCompletenessStats();

  setErrors([]);
  setStatus(editingId === null ? `${savedProduct.name} toegevoegd.` : `${savedProduct.name} bijgewerkt.`, "accent");
  resetForm();
};

const bindFormInteractions = () => {
  root.form?.addEventListener("submit", saveProduct);

  const rerenderInputs = [
    fields.id,
    fields.name,
    fields.number,
    fields.slug,
    fields.category,
    fields.brand,
    fields.sku,
    fields.sellingPrice,
    fields.stock,
    fields.images,
    fields.description,
    fields.universe,
    fields.franchise,
    fields.edition,
    fields.variant,
    fields.condition,
    fields.boxCondition,
    fields.barcode,
    fields.releaseYear,
    fields.reserved,
    fields.exclusive,
    fields.chase,
    fields.vaulted,
    fields.signed,
  ].filter(Boolean);

  rerenderInputs.forEach((input) => {
    input.addEventListener("input", () => {
      if (input === fields.slug) {
        state.slugTouched = true;
      }

      if (input === fields.name || input === fields.number) {
        updateAutoSlug();
      }

      if (input === fields.images) {
        state.autoLinkedImages = parseImagesInput(fields.images.value);
      }

      updateCanonicalHint();
      renderPreview();
    });
  });

  fields.slug?.addEventListener("blur", () => {
    linkImagesBySlug();
  });

  [fields.category, fields.brand].forEach((input) => {
    input?.addEventListener("change", () => {
      updateCanonicalHint();
      linkImagesBySlug();
    });
  });

  root.autoLink?.addEventListener("click", () => {
    linkImagesBySlug();
  });

  root.slugReset?.addEventListener("click", () => {
    state.slugTouched = false;
    updateAutoSlug();
    updateCanonicalHint();
    linkImagesBySlug();
  });

  root.cancel?.addEventListener("click", () => {
    resetForm();
  });

  root.resetData?.addEventListener("click", async () => {
    const confirmed = window.confirm("Lokale adminwijzigingen verwijderen en producten opnieuw laden vanuit Data/products.json?");
    if (!confirmed) return;

    clearSavedCatalog();
    const loaded = await loadProductCatalog();
    setProducts(loaded.products);
    renderFilterOptions();
    renderTable();
    renderCompletenessStats();
    resetForm();
    resetImportPreview();
    setStatus("Lokale adminwijzigingen zijn verwijderd.", "accent");
  });

  [
    root.search,
    root.universeFilter,
    root.franchiseFilter,
    root.stockFilter,
    root.missingFilter,
    root.archiveFilter,
  ].forEach((element) => {
    element?.addEventListener("input", renderTable);
    element?.addEventListener("change", renderTable);
  });

  root.exportButton?.addEventListener("click", () => {
    const stamp = new Date().toISOString().slice(0, 10);
    downloadJson(state.products, `products-${stamp}.json`);
    setStatus("Catalogus geëxporteerd als products.json.", "accent");
  });

  root.importButton?.addEventListener("click", () => {
    root.importInput?.click();
  });

  root.importInput?.addEventListener("change", async () => {
    const file = root.importInput.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) {
        throw new Error("Het JSON-bestand moet een array met producten bevatten.");
      }

      const normalized = normalizeProductCatalog(parsed);
      state.importPreviewProducts = normalized;
      renderImportPreview(normalized);
      setStatus("Importbestand gecontroleerd. Bekijk de preview voordat je toepast.", "muted");
      setErrors([]);
    } catch (error) {
      state.importPreviewProducts = null;
      resetImportPreview();
      setErrors([error.message || "Importeren is mislukt."]);
      setStatus("Importbestand ongeldig.", "error");
    } finally {
      root.importInput.value = "";
    }
  });
};

const init = async () => {
  if (root.sidebar) root.sidebar.innerHTML = createAdminSidebar("products");
  if (root.topbar) root.topbar.innerHTML = createAdminTopbar("Producten");

  bindFormInteractions();

  try {
    const loaded = await loadProductCatalog();
    setProducts(loaded.products);
    renderFilterOptions();
    renderTable();
    renderCompletenessStats();
    resetForm();

    setStatus(
      loaded.source === "local"
        ? "Producten geladen vanuit lokale adminwijzigingen."
        : "Producten geladen vanuit Data/products.json.",
      "muted"
    );
  } catch (error) {
    setStatus("Productcatalogus kan niet worden geladen.", "error");
    setErrors([error.message]);

    try {
      const fallback = await loadFileProductCatalog();
      setProducts(fallback);
      renderFilterOptions();
      renderTable();
      renderCompletenessStats();
      resetForm();
    } catch {
      // no-op
    }
  }
};

init();
