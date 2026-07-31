export const PRODUCT_CATEGORIES = [
  "All",
  "Funko Pop",
  "Funko Pop! Disney",
  "Funko Pop! Movies",
  "Funko Pop! Games",
  "Funko Pop! Animation",
  "Funko Pop! Rides",
  "Funko Pop! Sports",
];

const slugify = (value = "") => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export const PRODUCT_DEFAULTS = {
  id: 0,
  sku: "",
  barcode: "",
  category: "Funko Pop",
  brand: "",
  franchise: "",
  universe: "",
  name: "",
  number: "",
  edition: "Standard",
  exclusive: false,
  chase: false,
  vaulted: false,
  signed: false,
  condition: "Mint",
  price: 0,
  stock: 0,
  releaseYear: new Date().getFullYear(),
  image: "",
  gallery: [],
  description: "",
  tags: [],
  slug: "",
};

export const normalizeProduct = (rawProduct = {}) => {
  const normalized = {
    ...PRODUCT_DEFAULTS,
    ...rawProduct,
  };

  normalized.category = PRODUCT_CATEGORIES.includes(rawProduct.category)
    ? rawProduct.category
    : PRODUCT_DEFAULTS.category;

  normalized.price = Number(rawProduct.price) || 0;
  normalized.stock = Number(rawProduct.stock) || 0;
  normalized.releaseYear = Number(rawProduct.releaseYear) || new Date().getFullYear();
  normalized.exclusive = Boolean(rawProduct.exclusive);
  normalized.chase = Boolean(rawProduct.chase);
  normalized.vaulted = Boolean(rawProduct.vaulted);
  normalized.signed = Boolean(rawProduct.signed);
  normalized.gallery = Array.isArray(rawProduct.gallery) && rawProduct.gallery.length
    ? rawProduct.gallery
    : [rawProduct.image].filter(Boolean);
  normalized.tags = Array.isArray(rawProduct.tags)
    ? rawProduct.tags
    : typeof rawProduct.tags === "string"
      ? rawProduct.tags.split(",").map((tag) => tag.trim()).filter(Boolean)
      : [];
  normalized.slug = rawProduct.slug || slugify(rawProduct.name || "");

  return normalized;
};

export const createProductBadge = (product) => {
  if (product.exclusive) return "Exclusive";
  if (product.chase) return "Chase";
  if (product.vaulted) return "Vaulted";
  if (product.signed) return "Signed";
  return "New";
};
