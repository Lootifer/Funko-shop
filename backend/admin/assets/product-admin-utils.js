import { normalizeProduct } from "../../Products/product-schema.js";
import { getMappedImageSet, PREMIUM_PLACEHOLDER_IMAGE } from "../../Products/product-media.js";

const slugify = (value = "") => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export const REQUIRED_FIELDS = [
  "id",
  "name",
  "slug",
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

export const buildAutoSku = ({ name = "", number = "" } = {}) => {
  const cleanName = slugify(name).toUpperCase();
  const cleanNumber = String(number || "").replace(/#/g, "").trim().replace(/[^a-z0-9-]+/gi, "-").replace(/(^-|-$)/g, "").toUpperCase();
  if (!cleanName || !cleanNumber) return "";
  return `FP-${cleanName}-${cleanNumber}`;
};

const normalizeUniverseFolder = (universe = "", category = "") => {
  const categoryValue = String(category || "").trim().toLowerCase();

  // The selected Funko subcategory determines the image folder.
  if (categoryValue.includes("funko movies")) return "Movies";
  if (categoryValue.includes("funko television")) return "Television";
  if (categoryValue.includes("funko animation")) return "Animation";
  if (categoryValue.includes("funko games")) return "Games";
  if (categoryValue.includes("funko heroes")) return "Heroes";
  if (categoryValue.includes("funko pin")) return "Pin";
  if (categoryValue.includes("funko bitty pop")) return "Bitty Pop";
  if (categoryValue.includes("funko tee")) return "Tee";

  const value = String(universe || "").trim().toLowerCase();
  if (value.includes("marvel")) return "Marvel";
  if (value.includes("dc") || value.includes("batman")) return "DC";
  if (value.includes("disney")) return "Disney";
  if (value.includes("anime") || value.includes("dragon") || value.includes("naruto") || value.includes("one piece")) return "Anime";
  if (value.includes("game")) return "Games";
  if (value.includes("tv") || value.includes("television")) return "Television";
  return "Movies";
};

const getCategoryRoot = ({ category = "", brand = "" } = {}) => {
  const source = `${category} ${brand}`.toLowerCase();
  if (source.includes("funko")) return "funko";
  if (source.includes("lego")) return "lego";
  if (source.includes("hot toys") || source.includes("hottoys")) return "Hot Toys";
  if (source.includes("pokemon")) return "Pokémon";
  if (source.includes("trading cards") || source.includes("tcg")) return "Trading Cards";
  if (source.includes("statue")) return "Statues";
  return "funko";
};

const IMAGE_BASE_NAMES = ["front", "back", "left", "right", "box"];
const IMAGE_EXTENSIONS = ["webp", "jpg", "jpeg", "png"];

export const getCanonicalImageInfo = ({ slug = "", category = "", brand = "", universe = "" } = {}) => {
  const safeSlug = slugify(slug);
  const root = getCategoryRoot({ category, brand });
  const folder = root === "funko"
    ? `Assets/Images/Products/${root}/${normalizeUniverseFolder(universe, category)}/${safeSlug}`
    : `Assets/Images/Products/${root}/${safeSlug}`;

  const isFunko = root === "funko";
  const baseNames = isFunko ? IMAGE_BASE_NAMES.slice(0, 4) : IMAGE_BASE_NAMES;
  return {
    folder,
    baseNames,
    paths: baseNames.map((baseName) => `${folder}/${baseName}.webp / .jpg / .jpeg / .png`),
  };
};

const sanitizeList = (items = []) => {
  return [...new Set(items.map((item) => String(item).trim()).filter(Boolean))];
};

const isFunkoProduct = (product = {}) => {
  const category = String(product.category || "").toLowerCase();
  const brand = String(product.brand || "").toLowerCase();
  return category.startsWith("funko") || brand === "funko" || brand.includes("funko");
};

const limitImagesForProduct = (product = {}, images = []) => {
  const clean = sanitizeList(images);
  return isFunkoProduct(product) ? clean.slice(0, 4) : clean;
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

const toAdminFetchUrl = (path = "") => {
  const clean = String(path || "").trim();
  if (!clean) return clean;
  if (/^https?:\/\//i.test(clean)) return clean;
  if (clean.startsWith("../")) return clean;
  if (clean.startsWith("Assets/")) return `../${clean}`;
  return clean;
};

const buildImageCandidates = (folder, baseName) => {
  const normal = IMAGE_EXTENSIONS.map((extension) => `${folder}/${baseName}.${extension}`);
  // Also tolerate photos that were renamed in Explorer without converting the original JPG/PNG,
  // for example front.webp.JPG. These are accepted for local migration, while front.jpg is preferred.
  const legacyDoubleExtensions = [
    `${folder}/${baseName}.webp.jpg`,
    `${folder}/${baseName}.webp.jpeg`,
    `${folder}/${baseName}.webp.png`,
    `${folder}/${baseName}.webp.JPG`,
    `${folder}/${baseName}.webp.JPEG`,
    `${folder}/${baseName}.webp.PNG`,
  ];
  return [...normal, ...legacyDoubleExtensions];
};

export const getMappedImagesForSlug = async ({ slug, category, brand, universe = "" } = {}) => {
  if (!slug) return [];

  const canonical = getCanonicalImageInfo({ slug, category, brand, universe });
  const linked = [];

  for (const baseName of canonical.baseNames) {
    const candidates = buildImageCandidates(canonical.folder, baseName);
    let found = "";
    for (const imagePath of candidates) {
      if (await fetchImage(toAdminFetchUrl(imagePath))) {
        found = imagePath;
        break;
      }
    }
    if (found) linked.push(found);
  }

  return limitImagesForProduct({ category, brand }, linked);
};

export const buildDraftFromForm = (formData) => {
  const name = String(formData.name || "").trim();
  const rawNumber = String(formData.number || "").trim();
  const number = rawNumber === "#" ? "" : rawNumber;
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
    edition: String(formData.edition || "").trim(),
    variant: String(formData.variant || "Standard").trim(),
    releaseYear: Number(formData.releaseYear || new Date().getFullYear()),
    condition: String(formData.condition || "Mint").trim(),
    boxCondition: String(formData.boxCondition || "Mint").trim(),
    neverOutOfBox: toBoolean(formData.neverOutOfBox),
    figureLikeNew: toBoolean(formData.figureLikeNew),
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
    protectorIncluded: false,
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
      errors.push(`${field} is verplicht.`);
    }
  });

  if (!draft.slug) {
    errors.push("slug is verplicht.");
  }

  if (Number.isNaN(draft.id) || Number(draft.id) <= 0) {
    errors.push("id moet groter zijn dan 0.");
  }

  if (Number.isNaN(draft.sellingPrice) || draft.sellingPrice <= 0) {
    errors.push("sellingPrice moet groter zijn dan 0.");
  }

  if (Number.isNaN(draft.stock) || draft.stock < 0) {
    errors.push("stock moet 0 of hoger zijn.");
  }

  if (isFunkoProduct(draft) && Array.isArray(draft.images) && draft.images.length > 4) {
    errors.push("Funko mag maximaal 4 afbeeldingen hebben.");
  }

  const currentId = editingId === null ? null : Number(editingId);
  const duplicateId = products.find((product) => Number(product.id) === Number(draft.id) && Number(product.id) !== currentId);
  if (duplicateId) {
    errors.push(`Dubbel id gevonden: ${draft.id}`);
  }

  const duplicateSlug = products.find((product) => product.slug?.toLowerCase() === draft.slug.toLowerCase() && Number(product.id) !== currentId);
  if (duplicateSlug) {
    errors.push(`Dubbele slug gevonden: ${draft.slug}`);
  }

  const duplicateSku = products.find((product) => product.sku?.toLowerCase() === draft.sku.toLowerCase() && Number(product.id) !== currentId);
  if (duplicateSku) {
    errors.push(`Dubbele SKU gevonden: ${draft.sku}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

export const getProductCompleteness = (product = {}) => {
  const hasPrice = Number(product.sellingPrice) > 0;
  const barcode = String(product.barcode || "").trim();
  const hasBarcode = Boolean(barcode) && !/^unknown/i.test(barcode);
  const hasReleaseYear = Number(product.releaseYear) > 0;
  const hasDescription = Boolean(String(product.description || "").trim());
  const images = Array.isArray(product.images) ? product.images.filter(Boolean) : [];
  const requiredPhotoCount = isFunkoProduct(product) ? 1 : 5;
  const hasPhotos = images.length >= requiredPhotoCount && images[0] !== PREMIUM_PLACEHOLDER_IMAGE;

  const missing = [];
  if (!hasPrice) missing.push("prijs");
  if (!hasBarcode) missing.push("barcode");
  if (!hasReleaseYear) missing.push("uitgavejaar");
  if (!hasDescription) missing.push("beschrijving");
  if (!hasPhotos) missing.push("foto's");

  return {
    complete: missing.length === 0,
    missing,
  };
};

export const buildProductForSave = ({ draft, existingProduct = null, autoLinkedImages = [] }) => {
  const sourceImages = autoLinkedImages.length ? autoLinkedImages : draft.images;
  const imageSet = limitImagesForProduct(draft, sourceImages);
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
    metaTitle: `${draft.name || "Collectible"} ${draft.number || ""} | 2nd Life Toys`.trim(),
    metaDescription: draft.description || `${draft.name || "Collectible"} premium listing.`,
    convention: existingProduct?.convention || "",
  };

  return normalizeProduct(payload);
};
