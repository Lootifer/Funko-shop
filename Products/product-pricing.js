export const PRICE_ON_REQUEST_LABEL = "Prijs op aanvraag";

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toPositiveNumber = (value) => {
  const parsed = toNumber(value);
  return parsed > 0 ? parsed : 0;
};

export const getSellingPrice = (product = {}) => {
  const selling = toPositiveNumber(product.sellingPrice);
  if (selling > 0) return selling;
  return toPositiveNumber(product.price);
};

export const hasValidSellingPrice = (product = {}) => getSellingPrice(product) > 0;

export const getValidDiscountPrice = (product = {}) => {
  const selling = getSellingPrice(product);
  const discount = toPositiveNumber(product.discountPrice);
  if (selling > 0 && discount > 0 && discount < selling) return discount;
  return null;
};

export const hasValidDiscountPrice = (product = {}) => getValidDiscountPrice(product) !== null;

export const getDisplayPrice = (product = {}) => {
  const discount = getValidDiscountPrice(product);
  if (discount !== null) return discount;
  return getSellingPrice(product);
};

export const getProductPriceLabel = (product = {}, formatCurrency = (value) => String(value)) => {
  if (!hasValidSellingPrice(product)) return PRICE_ON_REQUEST_LABEL;
  return formatCurrency(getDisplayPrice(product));
};
