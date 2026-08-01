import { createAdminSidebar, createAdminTopbar } from "../components/layout.js";
import { createProductCard } from "../../Components/ProductCard.js";
import { normalizeProductCatalog } from "../../Products/product-schema.js";
import { loadProductCatalog, saveProductCatalog, clearSavedCatalog } from "./product-admin-state.js";
import {
  buildAutoSlug,
  buildDraftFromForm,
  buildProductForSave,
  getMappedImagesForSlug,
  parseImagesInput,
  validateDraft,
} from "./product-admin-utils.js";

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
  root.errors.innerHTML = `<ul>${errors.map((error) => `<li>${error}</li>`).join("")}</ul>`;
};

const nextId = () => {
  const ids = state.products.map((product) => Number(product.id) || 0);
  return (Math.max(0, ...ids) + 1);
};

const setFormMode = (editing) => {
  if (root.mode) {
    root.mode.textContent = editing ? "Edit Product" : "Add Product";
  }
  if (root.submit) {
    root.submit.textContent = editing ? "Update Product" : "Save Product";
  }
  if (root.cancel) {
    root.cancel.style.display = editing ? "inline-flex" : "none";
  }
};

const resetForm = () => {
  root.form?.reset();
  if (fields.releaseYear) fields.releaseYear.value = String(new Date().getFullYear());
  if (fields.stock) fields.stock.value = "0";
  if (fields.sellingPrice) fields.sellingPrice.value = "0";
  if (fields.purchasePrice) fields.purchasePrice.value = "0";
  if (fields.reserved) fields.reserved.value = "0";
  if (fields.slug) fields.slug.value = "";
  if (fields.category) fields.category.value = "Funko Pop";
  if (fields.condition) fields.condition.value = "Mint";
  if (fields.boxCondition) fields.boxCondition.value = "Mint";
  if (fields.edition) fields.edition.value = "Standard";
  if (fields.variant) fields.variant.value = "Standard";

  state.editingId = null;
  state.slugTouched = false;
  state.autoLinkedImages = [];
  setFormMode(false);
  setErrors([]);
  setStatus("Ready to create a product.", "muted");
  if (root.imageSource) root.imageSource.textContent = "Images: manual list or auto-linked by slug.";
  renderPreview();
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
  fields.releaseYear.value = String(product.releaseYear || new Date().getFullYear());
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

const renderTable = () => {
  if (!root.table) return;

  const rows = state.products
    .map((product) => {
      const status = product.stock > 0 ? "Live" : "Out of stock";
      return `
      <tr>
        <td>${product.name}</td>
        <td>${product.sku}</td>
        <td>${product.slug}</td>
        <td>${product.universe || product.category}</td>
        <td>${product.stock}</td>
        <td>${status}</td>
        <td>
          <div class="admin-row-actions">
            <button class="button secondary" type="button" data-edit-id="${product.id}">Edit</button>
            <button class="button secondary" type="button" data-delete-id="${product.id}">Delete</button>
          </div>
        </td>
      </tr>`;
    })
    .join("");

  root.table.innerHTML = `
    <div class="admin-card">
      <table class="admin-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>SKU</th>
            <th>Slug</th>
            <th>Universe</th>
            <th>Stock</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${rows || '<tr><td colspan="7">No products yet.</td></tr>'}
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
      setStatus(`Editing ${product.name}.`, "accent");
      renderPreview();
      root.form?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  root.table.querySelectorAll("[data-delete-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = Number(button.dataset.deleteId || 0);
      const product = state.products.find((item) => Number(item.id) === id);
      if (!product) return;

      const confirmed = window.confirm(`Delete ${product.name}?`);
      if (!confirmed) return;

      state.products = state.products.filter((item) => Number(item.id) !== id);
      saveProductCatalog(state.products);
      if (state.editingId === id) resetForm();
      renderTable();
      setStatus(`${product.name} deleted.`, "accent");
    });
  });
};

const renderPreview = () => {
  if (!root.preview) return;

  const draft = buildDraftFromForm(readFormData());
  const previewProduct = buildProductForSave({
    draft,
    autoLinkedImages: state.autoLinkedImages,
  });

  root.preview.innerHTML = createProductCard(previewProduct);
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
    if (root.imageSource) root.imageSource.textContent = "Images: add product name/number to generate slug first.";
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
    if (root.imageSource) {
      root.imageSource.textContent = `Images auto-linked from slug folder (${linked.length} found).`;
    }
  } else if (root.imageSource) {
    root.imageSource.textContent = "No slug folder images found. Using manual image list or fallback placeholder.";
  }

  renderPreview();
};

const saveProduct = async (event) => {
  event.preventDefault();

  const formData = readFormData();
  const draft = buildDraftFromForm(formData);
  const editingId = state.editingId;

  const validation = validateDraft({
    draft,
    products: state.products,
    editingId,
  });

  if (!validation.valid) {
    setErrors(validation.errors);
    setStatus("Fix validation errors before saving.", "error");
    return;
  }

  if (!state.autoLinkedImages.length && !parseImagesInput(formData.images).length) {
    await linkImagesBySlug();
  }

  const existingProduct = editingId === null
    ? null
    : state.products.find((item) => Number(item.id) === Number(editingId)) || null;

  const withId = {
    ...draft,
    id: editingId === null ? nextId() : Number(editingId),
  };

  const savedProduct = buildProductForSave({
    draft: withId,
    existingProduct,
    autoLinkedImages: state.autoLinkedImages,
  });

  const nextProducts = editingId === null
    ? [...state.products, savedProduct]
    : state.products.map((item) => (Number(item.id) === Number(editingId) ? savedProduct : item));

  state.products = normalizeProductCatalog(nextProducts);
  saveProductCatalog(state.products);

  setErrors([]);
  setStatus(editingId === null ? `${savedProduct.name} added.` : `${savedProduct.name} updated.`, "accent");

  renderTable();
  resetForm();
};

const bindFormInteractions = () => {
  root.form?.addEventListener("submit", saveProduct);

  const rerenderInputs = [
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

      renderPreview();
    });
  });

  fields.slug?.addEventListener("blur", () => {
    linkImagesBySlug();
  });

  [fields.category, fields.brand].forEach((input) => {
    input?.addEventListener("change", () => {
      linkImagesBySlug();
    });
  });

  root.autoLink?.addEventListener("click", () => {
    linkImagesBySlug();
  });

  root.slugReset?.addEventListener("click", () => {
    state.slugTouched = false;
    updateAutoSlug();
    linkImagesBySlug();
  });

  root.cancel?.addEventListener("click", () => {
    resetForm();
  });

  root.resetData?.addEventListener("click", async () => {
    const confirmed = window.confirm("Reset admin changes and reload products from Data/products.json?");
    if (!confirmed) return;

    clearSavedCatalog();
    const loaded = await loadProductCatalog();
    state.products = loaded.products;
    renderTable();
    resetForm();
    setStatus("Local admin overrides cleared.", "accent");
  });
};

const init = async () => {
  if (root.sidebar) root.sidebar.innerHTML = createAdminSidebar("products");
  if (root.topbar) root.topbar.innerHTML = createAdminTopbar("Products");

  bindFormInteractions();

  try {
    const loaded = await loadProductCatalog();
    state.products = loaded.products;
    renderTable();
    resetForm();
    setStatus(
      loaded.source === "local"
        ? "Loaded products from local admin changes."
        : "Loaded products from Data/products.json.",
      "muted"
    );
  } catch (error) {
    setStatus("Unable to load product catalog.", "error");
    setErrors([error.message]);
  }
};

init();
