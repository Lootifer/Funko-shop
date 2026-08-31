export const PREMIUM_PLACEHOLDER_IMAGE =
  "Assets/Images/Products/premium-placeholder.svg";

/*
 * Productfoto's staan per omgeving op hetzelfde domein als de webshop.
 * Live gebruikt daardoor automatisch https://2ndlifetoys.nl,
 * test gebruikt https://test.2ndlifetoys.nl.
 */
const PRODUCT_MEDIA_ORIGIN =
  typeof window !== "undefined" && window.location?.origin
    ? window.location.origin
    : "https://2ndlifetoys.nl";

const ROOT_PRODUCTS_PATH = "Assets/Images/Products";

const IMAGE_SEQUENCE = [
  "front.webp",
  "back.webp",
  "left.webp",
  "right.webp",
  "box.webp",
];

const isFunkoProduct = (product = {}) => {
  const category = String(
    product.category || ""
  ).toLowerCase();

  const brand = String(
    product.brand || ""
  ).toLowerCase();

  return (
    category.startsWith("funko") ||
    brand === "funko" ||
    brand.includes("funko")
  );
};

const unique = (items = []) =>
  [
    ...new Set(
      items
        .filter(Boolean)
        .map((item) =>
          String(item).trim()
        )
        .filter(Boolean)
    ),
  ];

const limitMediaImages = (
  product = {},
  images = []
) => {
  const clean = unique(images);

  return isFunkoProduct(product)
    ? clean.slice(0, 4)
    : clean;
};

const FUNKO_UNIVERSE_FOLDERS = {
  marvel: "Marvel",
  dc: "DC",
  disney: "Disney",
  anime: "Anime",
  games: "Games",
  movies: "Movies",
  television: "Television",
  animation: "Animation",
  heroes: "Heroes",
  pin: "Pin",
  bittyPop: "Bitty Pop",
  tee: "Tee",
};

const NON_FUNKO_ROOT_FOLDERS = {
  lego: "LEGO",
  "hot toys": "Hot Toys",
  pokemon: "Pokémon",
  "trading cards": "Trading Cards",
  statues: "Statues",
};

const KNOWN_LOCAL_IMAGE_FOLDERS = {
  "batman-funko-pop-593": [
    `${ROOT_PRODUCTS_PATH}/funko/DC/batman-funko-pop-593`,
    `${ROOT_PRODUCTS_PATH}/funko/batman-593`,
  ],

  "armored-batman-unmasked-funko-pop-113": [
    `${ROOT_PRODUCTS_PATH}/funko/DC/armored-batman-unmasked-funko-pop-113`,
  ],

  "black-orchid-funko-pop-435": [
    `${ROOT_PRODUCTS_PATH}/funko/DC/black-orchid-funko-pop-435`,
  ],

  "the-riddler-funko-pop-530": [
    `${ROOT_PRODUCTS_PATH}/funko/DC/the-riddler-funko-pop-530`,
  ],

  "two-face-funko-pop-66": [
    `${ROOT_PRODUCTS_PATH}/funko/DC/two-face-funko-pop-66`,
  ],

  "rescue-funko-pop-480": [
    `${ROOT_PRODUCTS_PATH}/funko/Marvel/rescue-funko-pop-480`,
  ],
};

const slugify = (value = "") =>
  String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const normalizeNumber = (
  value = ""
) =>
  String(value)
    .replace(/^#\s*/, "")
    .trim();

const isRemoteUrl = (
  value = ""
) =>
  /^https?:\/\//i.test(
    String(value)
  );

/*
 * Zet alleen lokale productfoto-paden om naar het domein
 * waarop de webshop op dat moment draait.
 *
 * Bijvoorbeeld op live:
 * Assets/Images/Products/funko/Movies/test/front.webp
 *
 * wordt:
 * https://2ndlifetoys.nl/Assets/Images/Products/funko/Movies/test/front.webp
 */
const toProductMediaUrl = (
  value = ""
) => {
  const original = String(
    value || ""
  ).trim();

  if (!original) {
    return "";
  }

  if (isRemoteUrl(original)) {
    return original;
  }

  let normalized = original
    .replace(/\\/g, "/")
    .replace(/^\.\//, "");

  while (
    normalized.startsWith("/")
  ) {
    normalized =
      normalized.slice(1);
  }

  if (
    normalized.startsWith(
      `${ROOT_PRODUCTS_PATH}/`
    )
  ) {
    return `${PRODUCT_MEDIA_ORIGIN}/${normalized}`;
  }

  return original;
};

const splitCandidates = (
  value = ""
) => {
  const text = String(
    value || ""
  ).trim();

  if (!text) {
    return [];
  }

  return unique(
    text
      .split("|")
      .map((candidate) =>
        toProductMediaUrl(
          candidate
        )
      )
  );
};

const buildCandidateBundle = (
  paths = []
) =>
  unique(paths).join("|");

const firstMediaCandidate = (
  value = ""
) =>
  splitCandidates(value)[0] ||
  "";

const getLegacySlug = (
  product = {}
) => {
  const compactSlug =
    slugify(
      `${product.name || ""} ${normalizeNumber(
        product.number || ""
      )}`
    );

  return (
    compactSlug ||
    slugify(
      product.slug || ""
    )
  );
};

const normalizeLabel = (
  value = ""
) =>
  String(value)
    .toLowerCase()
    .replace(
      /[^a-z0-9]+/g,
      " "
    )
    .trim();

const inferFunkoUniverseFolder = (
  product = {}
) => {
  const category =
    normalizeLabel(
      product.category
    );

  /*
   * Funko subcategorie krijgt voorrang
   * boven universe/franchise.
   */
  if (
    category.includes(
      "funko movies"
    )
  ) {
    return FUNKO_UNIVERSE_FOLDERS.movies;
  }

  if (
    category.includes(
      "funko television"
    )
  ) {
    return FUNKO_UNIVERSE_FOLDERS.television;
  }

  if (
    category.includes(
      "funko animation"
    )
  ) {
    return FUNKO_UNIVERSE_FOLDERS.animation;
  }

  if (
    category.includes(
      "funko games"
    )
  ) {
    return FUNKO_UNIVERSE_FOLDERS.games;
  }

  if (
    category.includes(
      "funko heroes"
    )
  ) {
    return FUNKO_UNIVERSE_FOLDERS.heroes;
  }

  if (
    category.includes(
      "funko pin"
    )
  ) {
    return FUNKO_UNIVERSE_FOLDERS.pin;
  }

  if (
    category.includes(
      "funko bitty pop"
    )
  ) {
    return FUNKO_UNIVERSE_FOLDERS.bittyPop;
  }

  if (
    category.includes(
      "funko tee"
    )
  ) {
    return FUNKO_UNIVERSE_FOLDERS.tee;
  }

  const source = [
    product.category,
    product.brand,
    product.universe,
    product.franchise,
    ...(Array.isArray(
      product.tags
    )
      ? product.tags
      : []),
  ]
    .map(normalizeLabel)
    .join(" ");

  if (
    source.includes("marvel")
  ) {
    return FUNKO_UNIVERSE_FOLDERS.marvel;
  }

  if (
    source.includes("dc")
  ) {
    return FUNKO_UNIVERSE_FOLDERS.dc;
  }

  if (
    source.includes("disney")
  ) {
    return FUNKO_UNIVERSE_FOLDERS.disney;
  }

  if (
    source.includes("anime") ||
    source.includes(
      "dragon ball"
    ) ||
    source.includes("naruto") ||
    source.includes("one piece")
  ) {
    return FUNKO_UNIVERSE_FOLDERS.anime;
  }

  if (
    source.includes("games") ||
    source.includes("gaming")
  ) {
    return FUNKO_UNIVERSE_FOLDERS.games;
  }

  if (
    source.includes(
      "television"
    ) ||
    source.includes("tv")
  ) {
    return FUNKO_UNIVERSE_FOLDERS.television;
  }

  return FUNKO_UNIVERSE_FOLDERS.movies;
};

const inferCategoryRootFolder = (
  product = {}
) => {
  const source = [
    product.category,
    product.brand,
    product.universe,
    product.franchise,
  ]
    .map(normalizeLabel)
    .join(" ");

  if (
    source.includes("funko")
  ) {
    return "Funko";
  }

  if (
    source.includes("lego")
  ) {
    return NON_FUNKO_ROOT_FOLDERS.lego;
  }

  if (
    source.includes(
      "hot toys"
    ) ||
    source.includes("hottoys")
  ) {
    return NON_FUNKO_ROOT_FOLDERS[
      "hot toys"
    ];
  }

  if (
    source.includes("pokemon")
  ) {
    return NON_FUNKO_ROOT_FOLDERS.pokemon;
  }

  if (
    source.includes(
      "trading cards"
    ) ||
    source.includes("tcg")
  ) {
    return NON_FUNKO_ROOT_FOLDERS[
      "trading cards"
    ];
  }

  if (
    source.includes("statue")
  ) {
    return NON_FUNKO_ROOT_FOLDERS.statues;
  }

  return "Funko";
};

const toImageArray = (
  value
) => {
  if (
    Array.isArray(value)
  ) {
    return unique(value);
  }

  if (
    typeof value !==
    "string"
  ) {
    return [];
  }

  const text =
    value.trim();

  if (!text) {
    return [];
  }

  if (
    !text.startsWith(
      "http"
    ) &&
    text.includes(",")
  ) {
    return unique(
      text.split(",")
    );
  }

  return [text];
};

const getBaseSlug = (
  product = {}
) => {
  const canonicalFromNameNumber =
    slugify(
      `${product.name || ""} ${normalizeNumber(
        product.number || ""
      )}`
    );

  const candidate =
    canonicalFromNameNumber ||
    product.slug ||
    product.name ||
    (product.id
      ? `product-${product.id}`
      : "product-item");

  return slugify(candidate);
};

const getKnownImageFolders = (
  product = {}
) => {
  const slug =
    slugify(
      product.slug || ""
    ) ||
    getBaseSlug(product);

  return (
    KNOWN_LOCAL_IMAGE_FOLDERS[
      slug
    ] || []
  );
};

const getLocalImageFolderFromPath = (
  path = ""
) => {
  const normalizedPath =
    String(path || "")
      .replace(/\\/g, "/");

  if (
    normalizedPath.includes("|")
  ) {
    return "";
  }

  if (
    !normalizedPath.startsWith(
      `${ROOT_PRODUCTS_PATH}/`
    )
  ) {
    return "";
  }

  const segments =
    normalizedPath.split("/");

  if (
    segments.length < 5
  ) {
    return "";
  }

  segments.pop();

  return segments.join("/");
};

const buildFolderCandidates = (
  product = {}
) => {
  return unique(
    getKnownImageFolders(
      product
    )
  );
};

export const getProductImageFolder = (
  product = {}
) => {
  return (
    buildFolderCandidates(
      product
    )[0] ||
    `${ROOT_PRODUCTS_PATH}/premium-placeholder.svg`
  );
};

export const getMappedImageSet = (
  product = {}
) => {
  const folderCandidates =
    buildFolderCandidates(
      product
    );

  const sequence =
    isFunkoProduct(product)
      ? IMAGE_SEQUENCE.slice(
          0,
          4
        )
      : IMAGE_SEQUENCE;

  const mapped =
    sequence.map(
      (fileName) =>
        buildCandidateBundle([
          ...folderCandidates.map(
            (folder) =>
              toProductMediaUrl(
                `${folder}/${fileName}`
              )
          ),

          PREMIUM_PLACEHOLDER_IMAGE,
        ])
    );

  return {
    thumbnail:
      mapped[0],

    images: mapped,

    boxFront:
      mapped[0],

    boxBack:
      mapped[1] ||
      mapped[0],

    leftSide:
      mapped[2] ||
      mapped[0],

    rightSide:
      mapped[3] ||
      mapped[0],
  };
};

export const resolveProductMedia = (
  product = {}
) => {
  const mapped =
    getMappedImageSet(
      product
    );

  const explicitImages =
    unique([
      ...toImageArray(
        product.images
      ),

      ...toImageArray(
        product.gallery
      ),

      product.thumbnail,
      product.image,
      product.boxFront,
      product.boxBack,
      product.leftSide,
      product.rightSide,
    ]);

  const explicitImageCandidates =
    unique(
      explicitImages.flatMap(
        (value) =>
          splitCandidates(
            value
          )
      )
    );

  const hasExplicitImages =
    explicitImageCandidates.length >
    0;

  const resolvedImages =
    hasExplicitImages
      ? explicitImageCandidates
      : mapped.images.flatMap(
          (value) =>
            splitCandidates(
              value
            )
        );

  const limitedImages =
    limitMediaImages(
      product,
      resolvedImages
    );

  const safeImages =
    limitedImages.length
      ? limitedImages
      : [
          PREMIUM_PLACEHOLDER_IMAGE,
        ];

  const explicitThumbnail =
    firstMediaCandidate(
      product.thumbnail
    ) ||
    firstMediaCandidate(
      product.image
    );

  const explicitBoxFront =
    firstMediaCandidate(
      product.boxFront
    );

  const explicitBoxBack =
    firstMediaCandidate(
      product.boxBack
    );

  const explicitLeftSide =
    firstMediaCandidate(
      product.leftSide
    );

  const explicitRightSide =
    firstMediaCandidate(
      product.rightSide
    );

  const thumbnail =
    hasExplicitImages
      ? (
          explicitThumbnail ||
          safeImages[0] ||
          PREMIUM_PLACEHOLDER_IMAGE
        )
      : (
          safeImages[0] ||
          PREMIUM_PLACEHOLDER_IMAGE
        );

  return {
    thumbnail,

    image: thumbnail,

    images: safeImages,

    gallery: safeImages,

    boxFront:
      hasExplicitImages
        ? (
            explicitBoxFront ||
            safeImages[0] ||
            PREMIUM_PLACEHOLDER_IMAGE
          )
        : (
            safeImages[0] ||
            PREMIUM_PLACEHOLDER_IMAGE
          ),

    boxBack:
      hasExplicitImages
        ? (
            explicitBoxBack ||
            safeImages[1] ||
            safeImages[0] ||
            PREMIUM_PLACEHOLDER_IMAGE
          )
        : (
            safeImages[1] ||
            safeImages[0] ||
            PREMIUM_PLACEHOLDER_IMAGE
          ),

    leftSide:
      hasExplicitImages
        ? (
            explicitLeftSide ||
            safeImages[2] ||
            safeImages[0] ||
            PREMIUM_PLACEHOLDER_IMAGE
          )
        : (
            safeImages[2] ||
            safeImages[0] ||
            PREMIUM_PLACEHOLDER_IMAGE
          ),

    rightSide:
      hasExplicitImages
        ? (
            explicitRightSide ||
            safeImages[3] ||
            safeImages[0] ||
            PREMIUM_PLACEHOLDER_IMAGE
          )
        : (
            safeImages[3] ||
            safeImages[0] ||
            PREMIUM_PLACEHOLDER_IMAGE
          ),
  };
};

const escapeHtmlAttribute = (
  value = ""
) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

export const createImageAttributes = ({
  src,
  alt,
  loading = "lazy",
} = {}) => {
  const candidates =
    unique([
      ...splitCandidates(
        src
      ),

      PREMIUM_PLACEHOLDER_IMAGE,
    ]);

  const safeSrc =
    candidates[0] ||
    PREMIUM_PLACEHOLDER_IMAGE;

  const encodedCandidates =
    escapeHtmlAttribute(
      candidates.join("|")
    );

  const safeAlt =
    escapeHtmlAttribute(
      alt || "Collectible"
    );

  const safeLoading =
    loading === "eager"
      ? "eager"
      : "lazy";

  return `src="${safeSrc}" alt="${safeAlt}" loading="${safeLoading}" data-premium-fallback="${PREMIUM_PLACEHOLDER_IMAGE}" data-premium-candidates="${encodedCandidates}" data-premium-index="0" onerror="const c=(this.dataset.premiumCandidates||'').split('|').filter(Boolean);const i=Number(this.dataset.premiumIndex||'0')+1;this.dataset.premiumIndex=String(i);if(i<c.length){this.src=c[i];return;}this.onerror=null;this.src=this.dataset.premiumFallback||'${PREMIUM_PLACEHOLDER_IMAGE}';"`;
};

export const attachPremiumFallback = (
  root = document
) => {
  if (
    !root?.querySelectorAll
  ) {
    return;
  }

  root
    .querySelectorAll(
      "img[data-premium-fallback]"
    )
    .forEach(
      (image) => {
        if (
          image.dataset
            .fallbackBound ===
          "true"
        ) {
          return;
        }

        /*
         * createImageAttributes bevat al
         * kandidaat-fallbacklogica.
         */
        if (
          image.getAttribute(
            "onerror"
          )
        ) {
          image.dataset.fallbackBound =
            "true";

          return;
        }

        image.addEventListener(
          "error",
          () => {
            const fallback =
              image.dataset
                .premiumFallback ||
              PREMIUM_PLACEHOLDER_IMAGE;

            const candidates =
              (
                image.dataset
                  .premiumCandidates ||
                ""
              )
                .split("|")
                .filter(Boolean);

            const nextIndex =
              Number(
                image.dataset
                  .premiumIndex ||
                  "0"
              ) + 1;

            image.dataset.premiumIndex =
              String(nextIndex);

            if (
              nextIndex <
              candidates.length
            ) {
              image.src =
                candidates[
                  nextIndex
                ];

              return;
            }

            if (
              image.src.endsWith(
                fallback
              )
            ) {
              return;
            }

            image.src =
              fallback;
          }
        );

        image.dataset.fallbackBound =
          "true";
      }
    );
};
