import { createAdminSidebar, createAdminTopbar } from "../components/layout.js";
import { requireAdminSession, wireAdminTopbar } from "./admin-auth.js";
import { createProductCard } from "../../Components/ProductCard.js";
import { normalizeProductCatalog } from "../../Products/product-schema.js";
import { downloadDatabaseBackupFromApi } from "../../Assets/Js/api-client.js";
import {
  archiveProduct,
  changeProductStock,
  createProduct,
  deleteProduct,
  loadFileProductCatalog,
  loadProductCatalog,
  saveProduct,
} from "./product-admin-state.js";
import {
  buildAutoSlug,
  buildAutoSku,
  buildDraftFromForm,
  buildProductForSave,
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
  backupDatabaseButton: document.getElementById("backupDatabaseButton"),
  editionPicker: document.getElementById("editionPicker"),
  editionPickerSummary: document.getElementById("editionPickerSummary"),
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
  neverOutOfBox: document.getElementById("fieldNeverOutOfBox"),
  figureLikeNew: document.getElementById("fieldFigureLikeNew"),
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
};

const state = {
  products: [],
  editingId: null,
  slugTouched: false,
  autoLinkedImages: [],
  importPreviewProducts: null,
  importPhotoCount: 0,
  importWarnings: [],
  skuTouched: false,
};

const editionOptions = [...document.querySelectorAll("[data-edition-option]")];

const getSelectedEditions = () => editionOptions
  .filter((option) => option.checked)
  .map((option) => option.value);

const syncEditionFieldFromOptions = () => {
  const selected = getSelectedEditions();
  if (fields.edition) fields.edition.value = selected.join(" | ");
  if (root.editionPickerSummary) {
    root.editionPickerSummary.textContent = selected.length
      ? `${selected.length} editie${selected.length === 1 ? "" : "s"} geselecteerd`
      : "Kies editie(s)";
  }
};

const syncEditionOptionsFromField = () => {
  const selected = new Set(String(fields.edition?.value || "")
    .split("|")
    .map((item) => item.trim())
    .filter((item) => item && item.toLowerCase() !== "standard"));
  editionOptions.forEach((option) => { option.checked = selected.has(option.value); });
  syncEditionFieldFromOptions();
};

const PRODUCT_DRAFT_KEY = "lootifer-admin-product-draft-v16";

const clearProductDraft = () => {
  try { window.localStorage.removeItem(PRODUCT_DRAFT_KEY); } catch { /* storage unavailable */ }
};

const persistProductDraft = () => {
  if (state.editingId !== null) return;
  try {
    window.localStorage.setItem(PRODUCT_DRAFT_KEY, JSON.stringify(readFormData()));
  } catch {
    // Never interrupt product entry if storage is unavailable.
  }
};

const restoreProductDraft = () => {
  if (state.editingId !== null) return false;
  try {
    const raw = window.localStorage.getItem(PRODUCT_DRAFT_KEY);
    if (!raw) return false;
    const saved = JSON.parse(raw);
    if (!saved || typeof saved !== "object") return false;

    Object.entries(fields).forEach(([key, element]) => {
      if (!element || !(key in saved)) return;
      if (element.type === "checkbox") element.checked = Boolean(saved[key]);
      else element.value = saved[key] ?? "";
    });

    if (fields.number && !String(fields.number.value || "").trim()) fields.number.value = "#";
    syncEditionOptionsFromField();
    state.slugTouched = Boolean(String(fields.slug?.value || "").trim());
    state.skuTouched = Boolean(String(fields.sku?.value || "").trim());
    state.autoLinkedImages = parseImagesInput(fields.images?.value || "");
    updateCanonicalHint();
    renderPreview();
    setStatus("Je niet-opgeslagen productinvoer is automatisch hersteld.", "accent");
    return true;
  } catch {
    return false;
  }
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

/*
 * JSON-imports moeten de waarden uit het bronbestand exact behouden.
 * Vooral categorie mag niet door een algemene normalizer terugvallen
 * naar "Funko Heroes".
 */
const normalizeImportProducts = (products = []) => {
  if (!Array.isArray(products)) return [];

  return products.map((rawProduct) => {
    const raw =
      rawProduct && typeof rawProduct === "object"
        ? rawProduct
        : {};

    const normalized =
      normalizeProductCatalog([raw])[0] || {};

    const exactCategory = String(
      raw.category ?? normalized.category ?? ""
    ).trim();

    return withAdminDefaults({
      ...normalized,
      ...raw,
      category: exactCategory,
      images: Array.isArray(raw.images)
        ? raw.images
        : Array.isArray(normalized.images)
          ? normalized.images
          : [],
      gallery: Array.isArray(raw.gallery)
        ? raw.gallery
        : Array.isArray(normalized.gallery)
          ? normalized.gallery
          : [],
      sellingPrice:
        raw.sellingPrice ??
        raw.price ??
        normalized.sellingPrice ??
        0,
    });
  });
};

const setExactSelectValue = (element, value = "") => {
  if (!element) return;

  const exactValue = String(value ?? "").trim();

  if (!exactValue) {
    element.value = "";
    return;
  }

  if (
    element.tagName === "SELECT" &&
    ![...element.options].some((option) => option.value === exactValue)
  ) {
    const option = document.createElement("option");
    option.value = exactValue;
    option.textContent = exactValue;
    element.appendChild(option);
  }

  element.value = exactValue;
};

const setProducts = (products = []) => {
  state.products = normalizeProductCatalog(products).map(withAdminDefaults);
};

const refreshProducts = async () => {
  const loaded = await loadProductCatalog();
  setProducts(loaded.products);
  renderFilterOptions();
  renderTable();
  renderCompletenessStats();
  if (state.editingId === null) {
    fields.id.value = String(nextId());
  }
  return loaded;
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
  state.importPhotoCount = 0;
  state.importWarnings = [];
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

  const normalized = normalizeImportProducts(products);
  const incomplete = normalized.filter(
    (product) => !getProductCompleteness(product).complete
  ).length;

  const photoText = state.importPhotoCount
    ? ` ${state.importPhotoCount} foto${state.importPhotoCount === 1 ? "" : "'s"} automatisch gekoppeld.`
    : "";

  const warningText = state.importWarnings.length
    ? `<p class="admin-detail" style="color:#f0b56c">${state.importWarnings
        .map(escapeHtml)
        .join("<br>")}</p>`
    : "";

  const productRows = normalized
    .map((product) => {
      const rawImage =
        (Array.isArray(product.images) && product.images[0]) ||
        product.thumbnail ||
        product.image ||
        "";

      const previewImage = toAdminAssetPath(
        String(rawImage || "").split("|")[0]
      );

      return `
        <article class="admin-card" style="display:grid;grid-template-columns:72px 1fr;gap:14px;align-items:center;margin-top:10px;padding:12px;">
          <div>
            ${
              previewImage
                ? `<img class="admin-thumb" src="${escapeHtml(previewImage)}" alt="${escapeHtml(product.name || "Product")}" />`
                : '<div class="admin-subline">Geen foto</div>'
            }
          </div>
          <div>
            <strong>${escapeHtml(product.name || "-")}</strong>
            <div class="admin-subline"><strong>Categorie:</strong> ${escapeHtml(product.category || "-")}</div>
            <div class="admin-subline"><strong>Prijs:</strong> ${euro.format(Number(product.sellingPrice) || 0)} • <strong>Voorraad:</strong> ${Number(product.stock) || 0}</div>
            <div class="admin-subline">ID ${Number(product.id) || 0} • ${escapeHtml(product.sku || "geen SKU")}</div>
          </div>
        </article>
      `;
    })
    .join("");

  root.importPreview.style.display = "block";
  root.importPreview.innerHTML = `
    <h4>Importvoorbeeld</h4>
    <p class="admin-detail">${normalized.length} producten gevonden. ${incomplete} onvolledig.${photoText}</p>
    ${warningText}
    ${productRows}
    <div class="admin-form-actions" style="margin-top:14px;">
      <button class="button primary" type="button" id="applyImportButton">Import toepassen</button>
      <button class="button secondary" type="button" id="cancelImportButton">Annuleren</button>
    </div>
  `;

  const applyButton = document.getElementById("applyImportButton");
  const cancelButton = document.getElementById("cancelImportButton");

  /*
   * Geen extra "weet je het zeker?"-melding meer.
   * Eén klik op Import toepassen is voldoende.
   */
  applyButton?.addEventListener("click", async () => {
    applyButton.disabled = true;

    try {
      await applyImportedProducts(normalized, {
        sourceLabel: "Import",
      });
      resetImportPreview();
    } catch (error) {
      setErrors([error.message]);
      setStatus(error.message, "error");
    } finally {
      applyButton.disabled = false;
    }
  });

  cancelButton?.addEventListener("click", () => {
    resetImportPreview();
    setStatus("Import geannuleerd.", "muted");
  });
};

const applyFormValues = (product) => {
  fields.id.value = String(product.id || "");
  fields.name.value = product.name || "";
  fields.number.value = product.number || "#";
  fields.slug.value = product.slug || "";
  fields.sku.value = product.sku || "";
  fields.barcode.value = product.barcode || "";
  setExactSelectValue(fields.category, product.category || "");
  fields.brand.value = product.brand || "";
  fields.universe.value = product.universe || "";
  fields.franchise.value = product.franchise || "";
  fields.edition.value = product.edition && String(product.edition).toLowerCase() !== "standard" ? product.edition : "";
  syncEditionOptionsFromField();
  fields.variant.value = product.variant || "Standard";
  fields.releaseYear.value = product.releaseYear ? String(product.releaseYear) : "";
  fields.condition.value = product.condition || "Mint";
  fields.boxCondition.value = product.boxCondition || "Mint";
  fields.neverOutOfBox.checked = Boolean(product.neverOutOfBox);
  fields.figureLikeNew.checked = Boolean(product.figureLikeNew);
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
};

const openImportedProductInForm = (product) => {
  if (!product) return;

  applyFormValues(product);

  state.editingId = Number(product.id);
  state.slugTouched = true;
  state.skuTouched = true;
  state.autoLinkedImages = parseImagesInput(fields.images?.value || "");

  setFormMode(true);
  updateCanonicalHint();
  renderPreview();
};

const findImportedProductAfterRefresh = (sourceProduct) => {
  const sourceId = Number(sourceProduct?.id);
  const sourceSku = String(sourceProduct?.sku || "").trim().toLowerCase();
  const sourceSlug = String(sourceProduct?.slug || "").trim().toLowerCase();

  return (
    state.products.find(
      (product) => sourceId && Number(product.id) === sourceId
    ) ||
    state.products.find(
      (product) =>
        sourceSku &&
        String(product.sku || "").trim().toLowerCase() === sourceSku
    ) ||
    state.products.find(
      (product) =>
        sourceSlug &&
        String(product.slug || "").trim().toLowerCase() === sourceSlug
    ) ||
    null
  );
};

const showImportedProductsInAdmin = (importedProducts = []) => {
  const refreshed = importedProducts
    .map(findImportedProductAfterRefresh)
    .filter(Boolean);

  if (!refreshed.length) {
    renderTable();
    return;
  }

  /*
   * Bij één product tonen we meteen alleen dat product in de lijst.
   * Bij meerdere producten laten we de volledige lijst staan.
   */
  if (root.search) {
    root.search.value =
      refreshed.length === 1
        ? String(refreshed[0].name || refreshed[0].sku || "")
        : "";
  }

  if (root.universeFilter) root.universeFilter.value = "";
  if (root.franchiseFilter) root.franchiseFilter.value = "";
  if (root.stockFilter) root.stockFilter.value = "";
  if (root.missingFilter) root.missingFilter.value = "";
  if (root.archiveFilter) root.archiveFilter.value = "active";

  renderTable();

  /*
   * Het eerste geïmporteerde product wordt direct in het formulier geopend,
   * inclusief categorie, prijs, voorraad en opgeslagen foto's.
   */
  openImportedProductInForm(refreshed[0]);
};

const applyImportedProducts = async (
  products,
  { sourceLabel = "JSON" } = {}
) => {
  const prepared = normalizeImportProducts(products);

  if (!prepared.length) {
    throw new Error("Er zijn geen producten gevonden om te importeren.");
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  downloadJson(state.products, `producten-backup-${stamp}.json`);

  const existingIds = new Set(
    state.products.map((item) => Number(item.id))
  );

  for (const product of prepared) {
    if (existingIds.has(Number(product.id))) {
      await saveProduct(Number(product.id), product);
    } else {
      await createProduct(product);
      existingIds.add(Number(product.id));
    }
  }

  await refreshProducts();
  showImportedProductsInAdmin(prepared);

  setErrors([]);
  setStatus(
    `${sourceLabel} succesvol geïmporteerd. ${prepared.length} product${prepared.length === 1 ? "" : "en"} direct geladen met categorie en foto's.`,
    "accent"
  );

  return prepared;
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
  if (fields.number) fields.number.value = "#";
  if (fields.sku) fields.sku.value = "";
  if (fields.category) fields.category.value = "Funko Heroes";
  if (fields.brand) fields.brand.value = "Funko";
  if (fields.condition) fields.condition.value = "Mint";
  if (fields.boxCondition) fields.boxCondition.value = "Mint";
  if (fields.edition) fields.edition.value = "";
  editionOptions.forEach((option) => { option.checked = false; });
  syncEditionFieldFromOptions();
  if (fields.variant) fields.variant.value = "Standard";

  state.editingId = null;
  state.slugTouched = false;
  state.skuTouched = false;
  state.autoLinkedImages = [];

  setFormMode(false);
  setErrors([]);
  setStatus("Klaar om een product toe te voegen.", "muted");
  if (root.imageSource) root.imageSource.textContent = "Gebruik â€˜Kies fotomapâ€™ of â€˜Kies 1-4 fotoâ€™sâ€™. De fotoâ€™s worden automatisch gekoppeld.";

  updateAutoSlug();
  updateAutoSku();
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

const updateAutoSku = () => {
  if (state.skuTouched || !fields.sku) return;
  fields.sku.value = buildAutoSku({
    name: fields.name?.value || "",
    number: fields.number?.value || "",
  });
};

const duplicateProduct = async (product) => {
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

  try {
    await createProduct(copy);
    await refreshProducts();
    setStatus(`${copy.name} is gedupliceerd.`, "accent");
  } catch (error) {
    setErrors([error.message]);
    setStatus(error.message, "error");
  }
};

const setProductArchived = async (id, archived) => {
  await archiveProduct(id, archived);
  await refreshProducts();
};

const adjustStock = async (id, delta) => {
  const product = state.products.find((item) => Number(item.id) === Number(id));
  if (!product) return;
  const nextStock = Math.max(0, (Number(product.stock) || 0) + delta);
  await changeProductStock(id, nextStock);
  await refreshProducts();
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
        <td>${escapeHtml(product.category || "-")}</td>
        <td>${euro.format(Number(product.sellingPrice) || 0)}</td>
        <td>
          <div class="admin-stock-controls">
            <button type="button" class="button secondary" data-stock-minus="${product.id}">âˆ’</button>
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
            <button class="button danger" type="button" data-delete-id="${product.id}">Verwijderen</button>
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
            <th>Categorie</th>
            <th>Verkoopprijs</th>
            <th>Voorraad</th>
            <th>Status</th>
            <th>Acties</th>
          </tr>
        </thead>
        <tbody>
          ${rows || '<tr><td colspan="7">Geen producten gevonden voor deze filters.</td></tr>'}
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
      state.skuTouched = true;
      state.autoLinkedImages = parseImagesInput(fields.images.value);
      setFormMode(true);
      setStatus(`${product.name} wordt bewerkt.`, "accent");
      updateCanonicalHint();
      renderPreview();
      root.form?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  root.table.querySelectorAll("[data-duplicate-id]").forEach((button) => {
    button.addEventListener("click", async () => {
      const id = Number(button.dataset.duplicateId || 0);
      const product = state.products.find((item) => Number(item.id) === id);
      if (!product) return;
      await duplicateProduct(product);
    });
  });

  root.table.querySelectorAll("[data-archive-id]").forEach((button) => {
    button.addEventListener("click", async () => {
      const id = Number(button.dataset.archiveId || 0);
      const archiveNext = button.dataset.archiveState === "1";
      const product = state.products.find((item) => Number(item.id) === id);
      try {
        await setProductArchived(id, archiveNext);
        if (product) {
          setStatus(`${product.name} is ${archiveNext ? "gearchiveerd" : "hersteld"}.`, "accent");
        }
      } catch (error) {
        setErrors([error.message]);
        setStatus(error.message, "error");
      }
    });
  });

  root.table.querySelectorAll("[data-delete-id]").forEach((button) => {
    button.addEventListener("click", async () => {
      const id = Number(button.dataset.deleteId || 0);
      const product = state.products.find((item) => Number(item.id) === id);
      if (!product) return;

      const confirmed = window.confirm(
        `Weet je zeker dat je â€œ${product.name}â€ definitief wilt verwijderen?\n\nDit kan niet ongedaan worden gemaakt.`
      );
      if (!confirmed) return;

      try {
        const result = await deleteProduct(id);
        await refreshProducts();
        if (state.editingId === id) resetForm();
        const historyNote = result.detachedOrderItems
          ? ` ${result.detachedOrderItems} historische orderregel(s) zijn bewaard.`
          : "";
        setErrors([]);
        setStatus(`${product.name} is definitief verwijderd.${historyNote}`, "accent");
      } catch (error) {
        setErrors([error.message]);
        setStatus(error.message, "error");
      }
    });
  });

  root.table.querySelectorAll("[data-stock-plus]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await adjustStock(Number(button.dataset.stockPlus || 0), 1);
        setStatus("Voorraad bijgewerkt via database.", "accent");
      } catch (error) {
        setErrors([error.message]);
        setStatus(error.message, "error");
      }
    });
  });

  root.table.querySelectorAll("[data-stock-minus]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await adjustStock(Number(button.dataset.stockMinus || 0), -1);
        setStatus("Voorraad bijgewerkt via database.", "accent");
      } catch (error) {
        setErrors([error.message]);
        setStatus(error.message, "error");
      }
    });
  });
};

const handleSaveProduct = async (event) => {
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

  const existingProduct = editingId === null
    ? null
    : state.products.find((item) => Number(item.id) === Number(editingId)) || null;

  const savedProduct = buildProductForSave({
    draft,
    existingProduct,
    autoLinkedImages: state.autoLinkedImages,
  });

  try {
    if (editingId === null) {
      await createProduct(savedProduct);
    } else {
      await saveProduct(Number(editingId), savedProduct);
    }

    await refreshProducts();
    setErrors([]);
    clearProductDraft();
    setStatus(editingId === null ? `${savedProduct.name} toegevoegd.` : `${savedProduct.name} bijgewerkt.`, "accent");
    resetForm();
  } catch (error) {
    setErrors([error.message]);
    setStatus(error.message, "error");
  }
};

const persistUploadedMediaForEditingProduct = async (event) => {
  const uploadedImages = Array.isArray(event?.detail?.images)
    ? event.detail.images.map((value) => String(value || "").trim()).filter(Boolean)
    : [];
  if (!uploadedImages.length) return;

  if (fields.images) fields.images.value = uploadedImages.join("\n");
  state.autoLinkedImages = uploadedImages;
  updateCanonicalHint();
  renderPreview();

  // New products are saved through the normal Product opslaan button.
  // Existing/imported products receive their uploaded media immediately.
  if (state.editingId === null) return;

  const editingId = Number(state.editingId);
  const existingProduct = state.products.find((item) => Number(item.id) === editingId) || null;
  if (!existingProduct) return;

  try {
    const draft = buildDraftFromForm(readFormData());
    const savedProduct = buildProductForSave({
      draft,
      existingProduct,
      autoLinkedImages: uploadedImages,
    });
    await saveProduct(editingId, savedProduct);
    await refreshProducts();
    setErrors([]);
    setStatus(`Foto's van ${savedProduct.name} zijn direct opgeslagen.`, "accent");
  } catch (error) {
    setErrors([error.message]);
    setStatus(`Foto's zijn geÃ¼pload, maar koppelen aan het product is mislukt: ${error.message}`, "error");
  }
};


const fileToDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result || ""));
  reader.onerror = () => reject(reader.error || new Error("Bestand kon niet worden gelezen."));
  reader.readAsDataURL(file);
});

const importZipBatch = async (file) => {
  const dataUrl = await fileToDataUrl(file);
  const defaultHost = window.location?.hostname || "localhost";
  const apiBase = window.LOOTIFER_API_BASE
    ? String(window.LOOTIFER_API_BASE).replace(/\/$/, "")
    : `http://${defaultHost}:3001/api`;
  const response = await fetch(`${apiBase}/site/product-batch-import`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dataUrl }),
  });
  const text = await response.text();
  let body = {};
  try { body = text ? JSON.parse(text) : {}; } catch { body = {}; }
  if (!response.ok) {
    if (response.status === 401) throw new Error("Je admin-sessie is verlopen. Log opnieuw in en probeer de ZIP opnieuw.");
    if (response.status === 413) throw new Error("De ZIP is te groot. Maak de foto's kleiner of importeer minder producten tegelijk.");
    throw new Error(body?.error || body?.details || `ZIP-import mislukt (${response.status}).`);
  }
  if (!Array.isArray(body.products)) throw new Error("De server gaf geen geldige productlijst terug.");
  return body;
};

const bindFormInteractions = () => {
  root.form?.addEventListener("submit", handleSaveProduct);
  window.addEventListener("lootifer:product-media-uploaded", persistUploadedMediaForEditingProduct);
  root.form?.addEventListener("input", persistProductDraft);
  root.form?.addEventListener("change", persistProductDraft);

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
      if (input === fields.sku) {
        state.skuTouched = true;
      }

      if (input === fields.name || input === fields.number) {
        updateAutoSlug();
        updateAutoSku();
      }

      if (input === fields.images) {
        state.autoLinkedImages = parseImagesInput(fields.images.value);
      }

      updateCanonicalHint();
      renderPreview();
      persistProductDraft();
    });
  });

  fields.number?.addEventListener("blur", () => {
    const clean = String(fields.number.value || "").trim().replace(/^#+/, "");
    fields.number.value = clean ? `#${clean}` : "#";
    updateAutoSlug();
    updateAutoSku();
    updateCanonicalHint();
    renderPreview();
    persistProductDraft();
  });

  editionOptions.forEach((option) => {
    option.addEventListener("change", () => {
      syncEditionFieldFromOptions();
      renderPreview();
      persistProductDraft();
    });
  });

  root.backupDatabaseButton?.addEventListener("click", async () => {
    root.backupDatabaseButton.disabled = true;
    setStatus("Backup wordt gemaaktâ€¦", "muted");
    try {
      const blob = await downloadDatabaseBackupFromApi();
      const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `lootifer-backup-${stamp}.sqlite`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setStatus("Backup gedownload. Bewaar dit .sqlite-bestand op een veilige plek.", "accent");
    } catch (error) {
      setErrors([error.message || "Backup maken is mislukt."]);
      setStatus("Backup maken is mislukt.", "error");
    } finally {
      root.backupDatabaseButton.disabled = false;
    }
  });

  fields.slug?.addEventListener("blur", () => {
    updateCanonicalHint();
    persistProductDraft();
  });

  [fields.category, fields.brand].forEach((input) => {
    input?.addEventListener("change", () => {
      updateCanonicalHint();
      persistProductDraft();
    });
  });

  root.slugReset?.addEventListener("click", () => {
    state.slugTouched = false;
    updateAutoSlug();
    updateCanonicalHint();
    persistProductDraft();
  });

  root.cancel?.addEventListener("click", () => {
    clearProductDraft();
    resetForm();
  });

  root.resetData?.addEventListener("click", async () => {
    const confirmed = window.confirm("Producten opnieuw laden vanuit de database?");
    if (!confirmed) return;

    try {
      await refreshProducts();
      clearProductDraft();
      resetForm();
      resetImportPreview();
      setStatus("Producten opnieuw geladen vanuit de database.", "accent");
      setErrors([]);
    } catch (error) {
      setErrors([error.message]);
      setStatus("De server is niet bereikbaar. Probeer het later opnieuw.", "error");
    }
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
    setStatus("Catalogus geÃ«xporteerd als products.json.", "accent");
  });

  root.importButton?.addEventListener("click", () => {
    root.importInput?.click();
  });

  root.importInput?.addEventListener("change", async () => {
    const file = root.importInput.files?.[0];
    if (!file) return;

    try {
      const isZip =
        /\.zip$/i.test(file.name) ||
        /zip/i.test(String(file.type || ""));

      if (isZip) {
        /*
         * ZIP blijft eerst een preview tonen, omdat een ZIP meerdere
         * producten en losse foto's kan bevatten.
         */
        setStatus(
          "ZIP met productgegevens en foto's wordt verwerkt…",
          "muted"
        );

        const result = await importZipBatch(file);
        const prepared = normalizeImportProducts(result.products);

        state.importPhotoCount = Number(result.importedPhotos) || 0;
        state.importWarnings = Array.isArray(result.warnings)
          ? result.warnings
          : [];
        state.importPreviewProducts = prepared;

        renderImportPreview(prepared);
        setStatus(
          `ZIP gecontroleerd. ${state.importPhotoCount} foto${state.importPhotoCount === 1 ? "" : "'s"} gekoppeld. Controleer de gegevens en klik één keer op Import toepassen.`,
          "muted"
        );
        setErrors([]);
      } else {
        /*
         * JSON: direct importeren.
         * Geen preview-knop en geen extra bevestigingsvraag meer.
         */
        const text = await file.text();
        const parsed = JSON.parse(text);

        if (!Array.isArray(parsed)) {
          throw new Error(
            "Het JSON-bestand moet een array met producten bevatten."
          );
        }

        state.importPhotoCount = 0;
        state.importWarnings = [];
        state.importPreviewProducts = null;
        resetImportPreview();

        const prepared = normalizeImportProducts(parsed);

        setStatus(
          `JSON wordt geïmporteerd… ${prepared.length} product${prepared.length === 1 ? "" : "en"} gevonden.`,
          "muted"
        );

        await applyImportedProducts(prepared, {
          sourceLabel: "JSON",
        });
      }
    } catch (error) {
      state.importPreviewProducts = null;
      resetImportPreview();
      setErrors([error.message || "Importeren is mislukt."]);
      setStatus("Importeren is mislukt.", "error");
    } finally {
      root.importInput.value = "";
    }
  });
};

const init = async () => {
  const user = await requireAdminSession();
  if (!user) return;

  if (root.sidebar) root.sidebar.innerHTML = createAdminSidebar("products");
  if (root.topbar) root.topbar.innerHTML = createAdminTopbar("Producten");
  wireAdminTopbar(user);

  bindFormInteractions();

  try {
    const loaded = await refreshProducts();
    resetForm();
    const restoredDraft = restoreProductDraft();

    if (!restoredDraft) setStatus(
      loaded.source === "api"
        ? "Producten geladen vanuit database."
        : "Producten geladen vanuit Data/products.json.",
      "muted"
    );
  } catch (error) {
    setStatus("De server is niet bereikbaar. Probeer het later opnieuw.", "error");
    setErrors([error.message]);

    try {
      const fallback = await loadFileProductCatalog();
      setProducts(fallback);
      renderFilterOptions();
      renderTable();
      renderCompletenessStats();
      resetForm();
      restoreProductDraft();
    } catch {
      // no-op
    }
  }
};

init();
