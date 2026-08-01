# Development Guide

## Project Overview

Lootifer Collectibles is a modular storefront built with plain HTML, CSS, and JavaScript. The project is designed to be easy to extend as a collector platform for Funko Pops, LEGO, Hot Wheels, action figures, trading cards, and other collectible categories.

## Folder Structure

- /: Project root containing the main entry pages and documentation.
- index.html: Main storefront homepage.
- product.html: Dedicated product detail page.
- Assets/: Static frontend assets.
  - Css/: Stylesheets organized by component.
  - Js/: JavaScript entry points and UI logic.
  - Icons/: Icons and supporting assets.
  - Images/: Image assets grouped by type.
- Data/: Data files such as products.json.
- Products/: Reusable product architecture modules.
  - product-schema.js: Product normalization and schema helpers.
  - product-card.js: Shared product card markup builder.
  - product-engine.js: Catalog filtering and rendering engine.
- README.md: Project overview and basic usage.
- DEVELOPMENT.md: Development documentation.

## Coding Rules

- Keep the codebase modular and reusable.
- Prefer small, focused JavaScript modules over large inline scripts.
- Separate data, presentation, and behavior whenever possible.
- Use semantic HTML for structure and accessibility.
- Keep styles organized by component and avoid duplication.
- Write clean, readable code with consistent indentation.
- Avoid hardcoding product content where JSON data can be used instead.
- Preserve responsive behavior across mobile and desktop layouts.

## Naming Conventions

- Use lowercase file names with hyphens when needed: product-card.js, product-engine.js.
- Use descriptive camelCase names for JavaScript variables and functions.
- Use kebab-case class names in HTML and CSS where applicable.
- Use clear and specific names for product fields, such as sku, barcode, franchise, edition, and releaseYear.
- Prefer meaningful names over abbreviations.

## Product Data Model

Products are stored in Data/products.json and now follow a canonical model designed for storefront use and import workflows.

Required fields by domain:

- General: id, slug, sku, barcode, category, brand, universe, franchise
- Product: name, number, edition, variant, exclusive, chase, vaulted, signed, convention, releaseYear
- Condition: condition, boxCondition, protectorIncluded
- Inventory: stock, warehouseLocation, reserved
- Pricing: purchasePrice, sellingPrice, discountPrice
- Media: thumbnail, images, boxFront, boxBack, leftSide, rightSide
- SEO: metaTitle, metaDescription

Compatibility fields kept for current frontend modules:

- price (derived from sellingPrice)
- image (derived from thumbnail)
- gallery (derived from images)
- description
- tags

### Example

```json
{
  "id": 593,
  "slug": "batman-593-fp-dc-001",
  "sku": "FP-DC-001",
  "barcode": "860001000593",
  "category": "Funko Pop",
  "brand": "Funko",
  "universe": "DC",
  "franchise": "Batman",
  "name": "Midnight Viper",
  "number": "#001",
  "edition": "Chrome",
  "variant": "Chrome Finish",
  "exclusive": true,
  "chase": false,
  "vaulted": false,
  "signed": false,
  "convention": "New York Comic Con",
  "releaseYear": 2024,
  "condition": "Mint",
  "boxCondition": "Mint",
  "protectorIncluded": true,
  "stock": 6,
  "warehouseLocation": "WH-DC-593",
  "reserved": 1,
  "purchasePrice": 144.42,
  "sellingPrice": 249,
  "discountPrice": null,
  "thumbnail": "Assets/Images/Products/funko/batman-593/front.webp",
  "images": [
    "Assets/Images/Products/funko/batman-593/front.webp",
    "Assets/Images/Products/funko/batman-593/back.webp"
  ],
  "boxFront": "Assets/Images/Products/funko/batman-593/front.webp",
  "boxBack": "Assets/Images/Products/funko/batman-593/back.webp",
  "leftSide": "Assets/Images/Products/funko/batman-593/left.webp",
  "rightSide": "Assets/Images/Products/funko/batman-593/right.webp",
  "metaTitle": "Midnight Viper #001 | Lootifer Collectibles",
  "metaDescription": "Chrome-finished collectible with numbered packaging and premium display appeal.",
  "price": 249,
  "image": "Assets/Images/Products/funko/batman-593/front.webp",
  "gallery": ["Assets/Images/Products/funko/batman-593/front.webp"],
  "description": "Chrome-finished collectible with numbered packaging and premium display appeal.",
  "tags": ["exclusive", "dc", "batman"]
}
```

## CSV and Excel Import Readiness

Use the following files to keep imports consistent:

- Data/products.import-template.csv: Canonical header row plus sample row.
- Data/products.import-map.json: Required fields, data types, aliases, and parsing settings.

Import rules:

1. Keep CSV headers aligned with canonical field names where possible.
2. For the images array, use the separator defined in products.import-map.json (currently `|`).
3. Use numeric types for id, stock, reserved, purchasePrice, sellingPrice, discountPrice, and releaseYear.
4. Use true/false for boolean fields (exclusive, chase, vaulted, signed, protectorIncluded).
5. Keep barcode values as strings to preserve leading zeros when needed.
6. Slugs are normalized and de-duplicated automatically at runtime. If duplicates exist, numeric suffixes are appended.
7. If images are omitted, the storefront maps media automatically to Assets/Images/Products/{category-folder}/{slug}/front.webp (and side/back variants).
8. Missing or broken product images fall back to the premium placeholder image.

## How to Add Products

1. Open Data/products.json.
2. Add a new product object following the schema above.
3. Use a unique id value.
4. Ensure the image and gallery paths are valid.
5. If image fields are omitted, place product files in the slug-mapped folder path and the app will resolve them automatically.
6. Include a short, accurate description and relevant tags.
7. Reload the site to confirm the product appears in the catalog and detail page.

## How to Add Categories

1. Update the supported category list in Products/product-schema.js.
2. Ensure the new category is reflected in the product data.
3. If needed, add category-specific visual styling or filter support.
4. Keep category names consistent and professional.

## Future Roadmap

- Add a shopping cart experience.
- Introduce user authentication and account profiles.
- Support wishlist and favorites.
- Add admin tools for product management.
- Expand filtering with advanced search and sorting.
- Introduce pagination for larger catalogs.
- Add CMS-style content management for product updates.

## Best Practices

- Keep product data normalized and consistent.
- Use the shared product modules instead of duplicating card or filter logic.
- Validate that new images are optimized and responsive.
- Prefer accessibility-friendly UI patterns, including labels and keyboard support.
- Keep documentation updated whenever architecture or workflows change.
- Test changes in both desktop and mobile layouts.
- Write maintainable code rather than quick workarounds.
