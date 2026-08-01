export const PREMIUM_PLACEHOLDER_IMAGE = "Assets/Images/Products/premium-placeholder.svg";

const IMAGE_SEQUENCE = ["front.webp", "back.webp", "left.webp", "right.webp", "box.webp"];

const ROOT_PRODUCTS_PATH = "Assets/Images/Products";

const FUNKO_UNIVERSE_FOLDERS = {
  marvel: "Marvel",
  dc: "DC",
  disney: "Disney",
  anime: "Anime",
  games: "Games",
  movies: "Movies",
  television: "Television",
};

const NON_FUNKO_ROOT_FOLDERS = {
  lego: "LEGO",
  "hot toys": "Hot Toys",
  pokemon: "Pokémon",
  "trading cards": "Trading Cards",
  statues: "Statues",
};

const slugify = (value = "") => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const unique = (items = []) => [...new Set(items.filter(Boolean).map((item) => String(item).trim()).filter(Boolean))];

const normalizeNumber = (value = "") => String(value).replace(/^#\s*/, "").trim();

const isRemoteUrl = (value = "") => /^https?:\/\//i.test(String(value));

const splitCandidates = (value = "") => {
  const text = String(value || "").trim();
  if (!text) return [];
  return unique(text.split("|"));
};

const buildCandidateBundle = (paths = []) => unique(paths).join("|");

const getLegacySlug = (product = {}) => {
  const compactSlug = slugify(`${product.name || ""} ${normalizeNumber(product.number || "")}`);
  return compactSlug || slugify(product.slug || "");
};

const normalizeLabel = (value = "") => String(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const inferFunkoUniverseFolder = (product = {}) => {
  const source = [
    product.category,
    product.brand,
    product.universe,
    product.franchise,
    ...(Array.isArray(product.tags) ? product.tags : []),
  ].map(normalizeLabel).join(" ");

  if (source.includes("marvel")) return FUNKO_UNIVERSE_FOLDERS.marvel;
  if (source.includes("dc")) return FUNKO_UNIVERSE_FOLDERS.dc;
  if (source.includes("disney")) return FUNKO_UNIVERSE_FOLDERS.disney;
  if (source.includes("anime") || source.includes("dragon ball") || source.includes("naruto") || source.includes("one piece")) {
    return FUNKO_UNIVERSE_FOLDERS.anime;
  }
  if (source.includes("games") || source.includes("gaming")) return FUNKO_UNIVERSE_FOLDERS.games;
  if (source.includes("television") || source.includes("tv")) return FUNKO_UNIVERSE_FOLDERS.television;
  return FUNKO_UNIVERSE_FOLDERS.movies;
};

const inferCategoryRootFolder = (product = {}) => {
  const source = [product.category, product.brand, product.universe, product.franchise].map(normalizeLabel).join(" ");

  if (source.includes("funko")) return "Funko";
  if (source.includes("lego")) return NON_FUNKO_ROOT_FOLDERS.lego;
  if (source.includes("hot toys") || source.includes("hottoys")) return NON_FUNKO_ROOT_FOLDERS["hot toys"];
  if (source.includes("pokemon")) return NON_FUNKO_ROOT_FOLDERS.pokemon;
  if (source.includes("trading cards") || source.includes("tcg")) return NON_FUNKO_ROOT_FOLDERS["trading cards"];
  if (source.includes("statue")) return NON_FUNKO_ROOT_FOLDERS.statues;

  return "Funko";
};

const toImageArray = (value) => {
  if (Array.isArray(value)) return unique(value);
  if (typeof value !== "string") return [];

  const text = value.trim();
  if (!text) return [];

  if (!text.startsWith("http") && text.includes(",")) {
    return unique(text.split(","));
  }

  return [text];
};

const getBaseSlug = (product = {}) => {
  const canonicalFromNameNumber = slugify(`${product.name || ""} ${normalizeNumber(product.number || "")}`);
  const candidate = canonicalFromNameNumber || product.slug || product.name || (product.id ? `product-${product.id}` : "product-item");
  return slugify(candidate);
};

const getLocalImageFolderFromPath = (path = "") => {
  const normalizedPath = String(path || "").replace(/\\/g, "/");
  if (normalizedPath.includes("|")) return "";
  if (!normalizedPath.startsWith(`${ROOT_PRODUCTS_PATH}/`)) return "";
  const segments = normalizedPath.split("/");
  if (segments.length < 5) return "";
  segments.pop();
  return segments.join("/");
};

const buildFolderCandidates = (product = {}) => {
  const baseSlug = slugify(product.slug || "") || getBaseSlug(product);
  const legacySlug = getLegacySlug(product);
  const rootFolder = inferCategoryRootFolder(product);
  const lowerRootFolder = rootFolder.toLowerCase();
  const explicitLocalFolders = unique([
    ...toImageArray(product.images),
    ...toImageArray(product.gallery),
    product.thumbnail,
    product.image,
    product.boxFront,
    product.boxBack,
    product.leftSide,
    product.rightSide,
  ].map(getLocalImageFolderFromPath));

  const primaryFolders = [];
  if (rootFolder === "Funko") {
    const universeFolder = inferFunkoUniverseFolder(product);
    primaryFolders.push(`${ROOT_PRODUCTS_PATH}/${rootFolder}/${universeFolder}/${baseSlug}`);
    primaryFolders.push(`${ROOT_PRODUCTS_PATH}/${rootFolder}/${universeFolder}/${legacySlug}`);
  } else {
    primaryFolders.push(`${ROOT_PRODUCTS_PATH}/${rootFolder}/${baseSlug}`);
    primaryFolders.push(`${ROOT_PRODUCTS_PATH}/${rootFolder}/${legacySlug}`);
  }

  const legacyFolders = [
    `${ROOT_PRODUCTS_PATH}/${lowerRootFolder}/${baseSlug}`,
    `${ROOT_PRODUCTS_PATH}/${lowerRootFolder}/${legacySlug}`,
  ];

  return unique([...primaryFolders, ...explicitLocalFolders, ...legacyFolders]);
};

export const getProductImageFolder = (product = {}) => {
  return buildFolderCandidates(product)[0] || `${ROOT_PRODUCTS_PATH}/Funko/Movies/${getBaseSlug(product)}`;
};

export const getMappedImageSet = (product = {}) => {
  const folderCandidates = buildFolderCandidates(product);
  const mapped = IMAGE_SEQUENCE.map((fileName) => buildCandidateBundle([
    ...folderCandidates.map((folder) => `${folder}/${fileName}`),
    PREMIUM_PLACEHOLDER_IMAGE,
  ]));

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

  const explicitImageCandidates = unique(explicitImages.flatMap((value) => splitCandidates(value)));
  const explicitRemoteImages = explicitImageCandidates.filter(isRemoteUrl);

  const resolvedImages = explicitRemoteImages.length ? explicitRemoteImages : mapped.images;
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
  const candidates = unique([...splitCandidates(src), PREMIUM_PLACEHOLDER_IMAGE]);
  const safeSrc = candidates[0] || PREMIUM_PLACEHOLDER_IMAGE;
  const encodedCandidates = escapeHtmlAttribute(candidates.join("|"));
  const safeAlt = escapeHtmlAttribute(alt || "Collectible");
  const safeLoading = loading === "eager" ? "eager" : "lazy";

  return `src="${safeSrc}" alt="${safeAlt}" loading="${safeLoading}" data-premium-fallback="${PREMIUM_PLACEHOLDER_IMAGE}" data-premium-candidates="${encodedCandidates}" data-premium-index="0" onerror="const c=(this.dataset.premiumCandidates||'').split('|').filter(Boolean);const i=Number(this.dataset.premiumIndex||'0')+1;this.dataset.premiumIndex=String(i);if(i<c.length){this.src=c[i];return;}this.onerror=null;this.src=this.dataset.premiumFallback||'${PREMIUM_PLACEHOLDER_IMAGE}';"`;
};

export const attachPremiumFallback = (root = document) => {
  if (!root?.querySelectorAll) return;

  root.querySelectorAll("img[data-premium-fallback]").forEach((image) => {
    if (image.dataset.fallbackBound === "true") return;

    // createImageAttributes already injects robust inline candidate fallback logic.
    // Avoid double error handlers that could skip valid candidate URLs.
    if (image.getAttribute("onerror")) {
      image.dataset.fallbackBound = "true";
      return;
    }

    image.addEventListener("error", () => {
      const fallback = image.dataset.premiumFallback || PREMIUM_PLACEHOLDER_IMAGE;
      const candidates = (image.dataset.premiumCandidates || "").split("|").filter(Boolean);
      const nextIndex = Number(image.dataset.premiumIndex || "0") + 1;

      image.dataset.premiumIndex = String(nextIndex);
      if (nextIndex < candidates.length) {
        image.src = candidates[nextIndex];
        return;
      }

      if (image.src.endsWith(fallback)) return;
      image.src = fallback;
    });

    image.dataset.fallbackBound = "true";
  });
};
