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

## JSON Schema

Products are stored in Data/products.json and should follow a consistent structure.

Recommended product fields:

- id: Number
- sku: String
- barcode: String
- category: String
- brand: String
- franchise: String
- universe: String
- name: String
- number: String
- edition: String
- exclusive: Boolean
- chase: Boolean
- vaulted: Boolean
- signed: Boolean
- condition: String
- price: Number
- stock: Number
- releaseYear: Number
- image: String
- gallery: Array of strings
- description: String
- tags: Array of strings

### Example

```json
{
  "id": 593,
  "sku": "FP-593",
  "barcode": "123456789012",
  "category": "Funko Pop",
  "brand": "Funko",
  "franchise": "DC",
  "universe": "DC Universe",
  "name": "Batman",
  "number": "001",
  "edition": "Exclusive",
  "exclusive": true,
  "chase": false,
  "vaulted": false,
  "signed": false,
  "condition": "Mint",
  "price": 34.99,
  "stock": 12,
  "releaseYear": 2023,
  "image": "Images/Products/batman.jpg",
  "gallery": ["Images/Products/batman-2.jpg"],
  "description": "A premium collector edition of Batman.",
  "tags": ["dc", "batman", "exclusive"]
}
```

## How to Add Products

1. Open Data/products.json.
2. Add a new product object following the schema above.
3. Use a unique id value.
4. Ensure the image and gallery paths are valid.
5. Include a short, accurate description and relevant tags.
6. Reload the site to confirm the product appears in the catalog and detail page.

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
