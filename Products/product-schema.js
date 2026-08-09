import { resolveProductMedia } from "./product-media.js";
import { getDisplayPrice, getSellingPrice, getValidDiscountPrice, hasValidSellingPrice } from "./product-pricing.js";

export const PRODUCT_CATEGORIES = [
  "All",
  "Funko Movies",
  "Funko Television",
  "Funko Pin",
  "Funko Bitty Pop",
  "Funko Games",
  "Funko Heroes",
  "Funko Tee",
  "Funko Animation",
  "LEGO",
  "Pokémon",
  "Star Wars",
  "Harry Potter",
  // Bestaande/legacy waarden blijven geldig totdat producten via admin zijn ingedeeld.
  "Funko Pop",
  "Funko Pop! Disney",
  "Funko Pop! Movies",
  "Funko Pop! Games",
  "Funko Pop! Animation",
  "Funko Pop! Rides",
  "Funko Pop! Sports",
];

const slugify = (value = "") => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const REQUIRED_PRODUCT_FIELDS = [
  "id",
  "name",
  "category",
  "sellingPrice",
  "stock",
];

const toBoolean = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return Boolean(value);
};

export const PRODUCT_DEFAULTS = {
  id: 0,
  slug: "",
  sku: "",
  barcode: "",
  category: "Funko Heroes",
  brand: "",
  franchise: "",
  universe: "",
  name: "",
  number: "",
  edition: "Standard",
  variant: "Standard",
  exclusive: false,
  chase: false,
  vaulted: false,
  signed: false,
  convention: "",
  releaseYear: new Date().getFullYear(),
  condition: "Mint",
  boxCondition: "Mint",
  neverOutOfBox: false,
  figureLikeNew: false,
  protectorIncluded: false,
  stock: 0,
  warehouseLocation: "",
  reserved: 0,
  purchasePrice: 0,
  sellingPrice: 0,
  discountPrice: null,
  thumbnail: "",
  images: [],
  boxFront: "",
  boxBack: "",
  leftSide: "",
  rightSide: "",
  metaTitle: "",
  metaDescription: "",
  price: 0,
  image: "",
  gallery: [],
  description: "",
  tags: [],
};

const DEFAULT_DESCRIPTION = "Details volgen zodra deze collectable volledig is verwerkt.";

export const validateProductsJson = (rawProducts) => {
  const errors = [];
  const warnings = [];

  if (!Array.isArray(rawProducts)) {
    errors.push("Data/products.json must contain a top-level array.");
    return { isValid: false, errors, warnings };
  }

  rawProducts.forEach((product, index) => {
    if (!product || typeof product !== "object" || Array.isArray(product)) {
      errors.push(`Product at index ${index} must be an object.`);
      return;
    }

    REQUIRED_PRODUCT_FIELDS.forEach((field) => {
      if (product[field] === undefined || product[field] === null || product[field] === "") {
        warnings.push(`Product at index ${index} is missing required field "${field}".`);
      }
    });

    if (product.images && !Array.isArray(product.images) && typeof product.images !== "string") {
      warnings.push(`Product at index ${index} has an invalid images value. Expected string[] or string.`);
    }

    if (product.gallery && !Array.isArray(product.gallery) && typeof product.gallery !== "string") {
      warnings.push(`Product at index ${index} has an invalid gallery value. Expected string[] or string.`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

export const normalizeProduct = (rawProduct = {}) => {
  const normalized = {
    ...PRODUCT_DEFAULTS,
    ...rawProduct,
  };

  normalized.category = PRODUCT_CATEGORIES.includes(rawProduct.category)
    ? rawProduct.category
    : PRODUCT_DEFAULTS.category;

  normalized.purchasePrice = Number(rawProduct.purchasePrice) || 0;
  normalized.sellingPrice = getSellingPrice(rawProduct);
  normalized.discountPrice = getValidDiscountPrice({
    sellingPrice: normalized.sellingPrice,
    discountPrice: rawProduct.discountPrice,
  });
  normalized.price = getDisplayPrice({
    sellingPrice: normalized.sellingPrice,
    discountPrice: normalized.discountPrice,
    price: rawProduct.price,
  });
  normalized.hasValidPrice = hasValidSellingPrice({ sellingPrice: normalized.sellingPrice, price: rawProduct.price });
  normalized.stock = Number(rawProduct.stock) || 0;
  normalized.reserved = Number(rawProduct.reserved) || 0;
  const releaseYear = Number(rawProduct.releaseYear);
  normalized.releaseYear = Number.isInteger(releaseYear) && releaseYear > 0 ? releaseYear : null;
  normalized.exclusive = toBoolean(rawProduct.exclusive);
  normalized.chase = toBoolean(rawProduct.chase);
  normalized.vaulted = toBoolean(rawProduct.vaulted);
  normalized.signed = toBoolean(rawProduct.signed);
  normalized.neverOutOfBox = toBoolean(rawProduct.neverOutOfBox);
  normalized.figureLikeNew = toBoolean(rawProduct.figureLikeNew);
  normalized.protectorIncluded = false;

  const media = resolveProductMedia({
    ...rawProduct,
    slug: rawProduct.slug || normalized.slug || slugify(rawProduct.name || ""),
    category: normalized.category,
    brand: normalized.brand,
  });

  normalized.images = media.images;
  normalized.thumbnail = media.thumbnail;
  normalized.boxFront = media.boxFront;
  normalized.boxBack = media.boxBack;
  normalized.leftSide = media.leftSide;
  normalized.rightSide = media.rightSide;

  normalized.image = media.image;
  normalized.gallery = media.gallery;

  normalized.metaTitle = rawProduct.metaTitle || `${rawProduct.name || "Collectible"} | Lootifer Collectibles`;
  normalized.metaDescription = rawProduct.metaDescription || rawProduct.description || "";
  normalized.description = (rawProduct.description || normalized.metaDescription || "").trim() || DEFAULT_DESCRIPTION;

  normalized.tags = Array.isArray(rawProduct.tags)
    ? rawProduct.tags
    : typeof rawProduct.tags === "string"
      ? rawProduct.tags.split(",").map((tag) => tag.trim()).filter(Boolean)
      : [];
  normalized.slug = rawProduct.slug || slugify(rawProduct.name || "");

  return normalized;
};

export const normalizeProductCatalog = (rawProducts = []) => {
  const validation = validateProductsJson(rawProducts);
  if (!validation.isValid) {
    throw new Error(validation.errors.join(" "));
  }

  if (validation.warnings.length) {
    console.warn("Product catalog warnings:", validation.warnings);
  }

  const usedSlugs = new Set();

  return rawProducts.map((rawProduct, index) => {
    const normalized = normalizeProduct(rawProduct);
    const baseSlug = normalized.slug || `product-${normalized.id || index + 1}`;

    let candidate = baseSlug;
    let suffix = 2;
    while (usedSlugs.has(candidate)) {
      candidate = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    usedSlugs.add(candidate);

    const media = resolveProductMedia({
      ...normalized,
      slug: candidate,
    });

    return {
      ...normalized,
      slug: candidate,
      ...media,
      image: media.thumbnail,
      gallery: media.images,
    };
  });
};

export const createProductBadge = (product) => {
  if (product.exclusive) return "Exclusive";
  if (product.chase) return "Chase";
  if (product.vaulted) return "Vaulted";
  if (product.signed) return "Signed";
  return "New";
};
