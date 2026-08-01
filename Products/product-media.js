const DEFAULT_CATEGORY_FOLDER = "funko";

export const PREMIUM_PLACEHOLDER_IMAGE = "Assets/Images/Products/premium-placeholder.svg";

const IMAGE_SEQUENCE = ["front.webp", "back.webp", "left.webp", "right.webp", "box.webp"];

const AVAILABLE_LOCAL_IMAGES = new Set([
  "Assets/Images/Products/funko/batman-593/front.webp",
  "Assets/Images/Products/funko/batman-593/back.webp",
  "Assets/Images/Products/funko/batman-593/left.webp",
  "Assets/Images/Products/funko/batman-593/right.webp",
  "Assets/Images/Products/funko/batman-593/box.webp",
]);

const slugify = (value = "") => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const unique = (items = []) => [...new Set(items.filter(Boolean).map((item) => String(item).trim()).filter(Boolean))];

const normalizeNumber = (value = "") => String(value).replace(/^#\s*/, "").trim();

const isRemoteUrl = (value = "") => /^https?:\/\//i.test(String(value));

const isKnownLocalImage = (value = "") => AVAILABLE_LOCAL_IMAGES.has(String(value));

const toImageArray = (value) => {
  if (Array.isArray(value)) return unique(value);
  if (typeof value !== "string") return [];

  const text = value.trim();
  if (!text) return [];

  if (text.includes("|")) {
    return unique(text.split("|"));
  }

  if (!text.startsWith("http") && text.includes(",")) {
    return unique(text.split(","));
  }

  return [text];
};

const getCategoryFolder = (product = {}) => {
  const source = `${product.category || ""} ${product.brand || ""}`.toLowerCase();
  if (source.includes("hot wheels") || source.includes("hotwheels")) return "hotwheels";
  if (source.includes("lego")) return "lego";
  return DEFAULT_CATEGORY_FOLDER;
};

const getBaseSlug = (product = {}) => {
  const canonicalFromNameNumber = slugify(`${product.name || ""} ${normalizeNumber(product.number || "")}`);
  const candidate = canonicalFromNameNumber || product.slug || product.name || (product.id ? `product-${product.id}` : "product-item");
  return slugify(candidate);
};

export const getProductImageFolder = (product = {}) => {
  const categoryFolder = getCategoryFolder(product);
  const slug = getBaseSlug(product);
  return `Assets/Images/Products/${categoryFolder}/${slug}`;
};

export const getMappedImageSet = (product = {}) => {
  const folder = getProductImageFolder(product);
  const mapped = IMAGE_SEQUENCE.map((fileName) => `${folder}/${fileName}`);

  return {
    thumbnail: mapped[0],
    images: mapped,
    boxFront: mapped[0],
    boxBack: mapped[1] || mapped[0],
    leftSide: mapped[2] || mapped[0],
    rightSide: mapped[3] || mapped[0],
  };
};

export const resolveProductMedia = (product = {}) => {
  const mapped = getMappedImageSet(product);

  const explicitImages = unique([
    ...toImageArray(product.images),
    ...toImageArray(product.gallery),
    product.thumbnail,
    product.image,
    product.boxFront,
    product.boxBack,
    product.leftSide,
    product.rightSide,
  ]);

  const explicitRemoteImages = explicitImages.filter(isRemoteUrl);
  const explicitKnownLocalImages = explicitImages.filter(isKnownLocalImage);
  const mappedKnownLocalImages = mapped.images.filter(isKnownLocalImage);

  const resolvedImages = explicitRemoteImages.length
    ? explicitRemoteImages
    : (explicitKnownLocalImages.length ? explicitKnownLocalImages : mappedKnownLocalImages);
  const safeImages = resolvedImages.length ? resolvedImages : [PREMIUM_PLACEHOLDER_IMAGE];
  const thumbnail = explicitRemoteImages.length
    ? (product.thumbnail || product.image || safeImages[0] || PREMIUM_PLACEHOLDER_IMAGE)
    : (safeImages[0] || PREMIUM_PLACEHOLDER_IMAGE);

  return {
    thumbnail,
    image: thumbnail,
    images: safeImages,
    gallery: safeImages,
    boxFront: explicitRemoteImages.length
      ? (product.boxFront || safeImages[0] || PREMIUM_PLACEHOLDER_IMAGE)
      : (safeImages[0] || PREMIUM_PLACEHOLDER_IMAGE),
    boxBack: explicitRemoteImages.length
      ? (product.boxBack || safeImages[1] || safeImages[0] || PREMIUM_PLACEHOLDER_IMAGE)
      : (safeImages[1] || safeImages[0] || PREMIUM_PLACEHOLDER_IMAGE),
    leftSide: explicitRemoteImages.length
      ? (product.leftSide || safeImages[2] || safeImages[0] || PREMIUM_PLACEHOLDER_IMAGE)
      : (safeImages[2] || safeImages[0] || PREMIUM_PLACEHOLDER_IMAGE),
    rightSide: explicitRemoteImages.length
      ? (product.rightSide || safeImages[3] || safeImages[0] || PREMIUM_PLACEHOLDER_IMAGE)
      : (safeImages[3] || safeImages[0] || PREMIUM_PLACEHOLDER_IMAGE),
  };
};

const escapeHtmlAttribute = (value = "") => String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export const createImageAttributes = ({ src, alt, loading = "lazy" } = {}) => {
  const safeSrc = isRemoteUrl(src) || isKnownLocalImage(src) ? src : PREMIUM_PLACEHOLDER_IMAGE;
  const safeAlt = escapeHtmlAttribute(alt || "Collectible");
  const safeLoading = loading === "eager" ? "eager" : "lazy";

  return `src="${safeSrc}" alt="${safeAlt}" loading="${safeLoading}" data-premium-fallback="${PREMIUM_PLACEHOLDER_IMAGE}" onerror="this.onerror=null;this.src=this.dataset.premiumFallback||'${PREMIUM_PLACEHOLDER_IMAGE}';"`;
};

export const attachPremiumFallback = (root = document) => {
  if (!root?.querySelectorAll) return;

  root.querySelectorAll("img[data-premium-fallback]").forEach((image) => {
    if (image.dataset.fallbackBound === "true") return;

    image.addEventListener("error", () => {
      const fallback = image.dataset.premiumFallback || PREMIUM_PLACEHOLDER_IMAGE;
      if (image.src.endsWith(fallback)) return;
      image.src = fallback;
    });

    image.dataset.fallbackBound = "true";
  });
};
