const safeJsonParse = (value, fallback) => {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const asBoolean = (value) => Boolean(Number(value));

export const toApiProduct = (row = {}) => {
  const images = safeJsonParse(row.images_json, []);
  const tags = safeJsonParse(row.tags_json, []);
  const sellingPrice = Number(row.selling_price) || 0;

  return {
    id: Number(row.id) || 0,
    slug: row.slug || "",
    sku: row.sku || "",
    barcode: row.barcode || "",
    category: row.category || "",
    brand: row.brand || "",
    universe: row.universe || "",
    franchise: row.franchise || "",
    name: row.name || "",
    number: row.number || "",
    edition: row.edition || "",
    variant: row.variant || "",
    exclusive: asBoolean(row.exclusive),
    chase: asBoolean(row.chase),
    vaulted: asBoolean(row.vaulted),
    signed: asBoolean(row.signed),
    convention: row.convention || "",
    releaseYear: row.release_year,
    condition: row.condition || "",
    boxCondition: row.box_condition || "",
    neverOutOfBox: asBoolean(row.never_out_of_box),
    figureLikeNew: asBoolean(row.figure_like_new),
    protectorIncluded: false,
    stock: Number(row.stock) || 0,
    warehouseLocation: row.warehouse_location || "",
    reserved: Number(row.reserved) || 0,
    purchasePrice: Number(row.purchase_price) || 0,
    sellingPrice,
    discountPrice: row.discount_price === null ? null : Number(row.discount_price) || 0,
    archived: Boolean(Number(row.archived) || 0),
    thumbnail: row.thumbnail || "",
    images,
    description: row.description || "",
    tags,
    boxFront: row.box_front || "",
    boxBack: row.box_back || "",
    leftSide: row.left_side || "",
    rightSide: row.right_side || "",
    metaTitle: row.meta_title || "",
    metaDescription: row.meta_description || "",
    price: sellingPrice,
    image: row.thumbnail || "",
    gallery: images,
  };
};

export const toApiOrder = (orderRow = {}, itemRows = []) => {
  const customer = safeJsonParse(orderRow.customer_json, {});
  const subtotal = Number(orderRow.subtotal) || 0;
  const total = Number(orderRow.total) || 0;
  const shippingCost = Math.max(0, Math.round((total - subtotal) * 100) / 100);

  return {
    id: Number(orderRow.id) || 0,
    number: orderRow.number || "",
    createdAt: orderRow.created_at,
    updatedAt: orderRow.updated_at,
    status: orderRow.status || "Nieuw",
    paymentStatus: orderRow.payment_status || "",
    isTestOrder: Boolean(Number(orderRow.is_test_order)),
    stockRestoredAt: orderRow.stock_restored_at,
    deliveryMethod: orderRow.delivery_method || "",
    total,
    subtotal,
    shippingCost,
    customer,
    notes: orderRow.notes || "",
    items: itemRows.map((item) => ({
      id: Number(item.product_id) || 0,
      name: item.product_name || "",
      price: Number(item.unit_price) || 0,
      quantity: Number(item.quantity) || 0,
      image: item.product_image || "",
    })),
  };
};
