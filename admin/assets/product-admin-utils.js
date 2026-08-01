import { normalizeProduct } from "../../Products/product-schema.js";
import { getMappedImageSet, PREMIUM_PLACEHOLDER_IMAGE } from "../../Products/product-media.js";

const slugify = (value = "") => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export const REQUIRED_FIELDS = [
  "name",
  "sku",
  "category",
  "brand",
  "universe",
  "franchise",
  "sellingPrice",
  "stock",
];

const toBoolean = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "yes" || normalized === "1";
  }
  return Boolean(value);
};

export const buildAutoSlug = ({ name = "", number = "" } = {}) => {
  return slugify(`${name} ${String(number).replace(/#/g, " ")}`);
};

const sanitizeList = (items = []) => {
  return [...new Set(items.map((item) => String(item).trim()).filter(Boolean))];
};

export const parseImagesInput = (value = "") => {
  if (!value) return [];
  if (Array.isArray(value)) return sanitizeList(value);

  const rows = String(value)
    .split(/\r?\n|\||,/)
    .map((item) => item.trim())
    .filter(Boolean);

  return sanitizeList(rows);
};

const fetchImage = async (url) => {
  try {
    const response = await fetch(url, { method: "HEAD" });
    if (response.ok) return true;
  } catch {
    // Continue to GET fallback.
  }

  try {
    const response = await fetch(url, { cache: "no-store" });
    return response.ok;
  } catch {
    return false;
  }
};

export const getMappedImagesForSlug = async ({ slug, category, brand } = {}) => {
  if (!slug) return [];

  const mapped = getMappedImageSet({ slug, category, brand }).images;
  const checks = await Promise.all(mapped.map((imagePath) => fetchImage(imagePath)));
  return mapped.filter((_, index) => checks[index]);
};

export const buildDraftFromForm = (formData) => {
  const name = String(formData.name || "").trim();
  const number = String(formData.number || "").trim();
  const slug = String(formData.slug || "").trim();

  return {
    id: Number(formData.id || 0),
    name,
    number,
    slug: slug || buildAutoSlug({ name, number }),
    sku: String(formData.sku || "").trim(),
    barcode: String(formData.barcode || "").trim(),
    category: String(formData.category || "").trim(),
    brand: String(formData.brand || "").trim(),
    universe: String(formData.universe || "").trim(),
    franchise: String(formData.franchise || "").trim(),
    edition: String(formData.edition || "Standard").trim(),
    variant: String(formData.variant || "Standard").trim(),
    releaseYear: Number(formData.releaseYear || new Date().getFullYear()),
    condition: String(formData.condition || "Mint").trim(),
    boxCondition: String(formData.boxCondition || "Mint").trim(),
    warehouseLocation: String(formData.warehouseLocation || "").trim(),
    description: String(formData.description || "").trim(),
    sellingPrice: Number(formData.sellingPrice || 0),
    purchasePrice: Number(formData.purchasePrice || 0),
    discountPrice: formData.discountPrice === "" ? null : Number(formData.discountPrice || 0),
    stock: Number(formData.stock || 0),
    reserved: Number(formData.reserved || 0),
    exclusive: toBoolean(formData.exclusive),
    chase: toBoolean(formData.chase),
    vaulted: toBoolean(formData.vaulted),
    signed: toBoolean(formData.signed),
    protectorIncluded: toBoolean(formData.protectorIncluded),
    tags: String(formData.tags || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    images: parseImagesInput(formData.images),
  };
};

export const validateDraft = ({ draft, products, editingId = null }) => {
  const errors = [];

  REQUIRED_FIELDS.forEach((field) => {
    const value = draft[field];
    if (value === undefined || value === null || value === "") {
      errors.push(`${field} is required.`);
    }
  });

  if (!draft.slug) {
    errors.push("slug is required.");
  }

  if (Number.isNaN(draft.sellingPrice) || draft.sellingPrice <= 0) {
    errors.push("sellingPrice must be greater than 0.");
  }

  if (Number.isNaN(draft.stock) || draft.stock < 0) {
    errors.push("stock must be 0 or greater.");
  }

  const currentId = editingId === null ? null : Number(editingId);
  const duplicateSlug = products.find((product) => product.slug?.toLowerCase() === draft.slug.toLowerCase() && Number(product.id) !== currentId);
  if (duplicateSlug) {
    errors.push(`Duplicate slug detected: ${draft.slug}`);
  }

  const duplicateSku = products.find((product) => product.sku?.toLowerCase() === draft.sku.toLowerCase() && Number(product.id) !== currentId);
  if (duplicateSku) {
    errors.push(`Duplicate SKU detected: ${draft.sku}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

export const buildProductForSave = ({ draft, existingProduct = null, autoLinkedImages = [] }) => {
  const imageSet = autoLinkedImages.length ? autoLinkedImages : draft.images;
  const thumbnail = imageSet[0] || PREMIUM_PLACEHOLDER_IMAGE;

  const payload = {
    ...(existingProduct || {}),
    ...draft,
    thumbnail,
    images: imageSet,
    image: thumbnail,
    gallery: imageSet,
    boxFront: imageSet[0] || thumbnail,
    boxBack: imageSet[1] || thumbnail,
    leftSide: imageSet[2] || thumbnail,
    rightSide: imageSet[3] || thumbnail,
    price: Number(draft.sellingPrice || 0),
    metaTitle: `${draft.name || "Collectible"} ${draft.number || ""} | Lootifer Collectibles`.trim(),
    metaDescription: draft.description || `${draft.name || "Collectible"} premium listing.`,
    convention: existingProduct?.convention || "",
  };

  return normalizeProduct(payload);
};
