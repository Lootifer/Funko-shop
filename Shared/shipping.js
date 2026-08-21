export const STANDARD_SHIPPING_COST = 6.95;
export const FREE_SHIPPING_THRESHOLD = 75;

const toMoney = (value) => Math.round((Number(value) || 0) * 100) / 100;

export const isNetherlands = (country = "Nederland") => {
  const normalized = String(country || "").trim().toLowerCase();

  return [
    "nederland",
    "netherlands",
    "the netherlands",
    "nl"
  ].includes(normalized);
};

export const calculateShippingCost = (subtotal, country = "Nederland") => {
  const safeSubtotal = Math.max(0, toMoney(subtotal));

  if (!isNetherlands(country)) return 0;

  if (
    safeSubtotal <= 0 ||
    safeSubtotal >= FREE_SHIPPING_THRESHOLD
  ) {
    return 0;
  }

  return STANDARD_SHIPPING_COST;
};

export const calculateOrderTotals = (subtotal, country = "Nederland") => {
  const safeSubtotal = Math.max(0, toMoney(subtotal));
  const domesticShipping = isNetherlands(country);
  const shippingCost = calculateShippingCost(safeSubtotal, country);

  return {
    subtotal: safeSubtotal,
    shippingCost,
    total: toMoney(safeSubtotal + shippingCost),

    amountUntilFreeShipping: domesticShipping
      ? Math.max(0, toMoney(FREE_SHIPPING_THRESHOLD - safeSubtotal))
      : 0,

    hasFreeShipping:
      domesticShipping &&
      safeSubtotal > 0 &&
      shippingCost === 0,

    internationalShippingPending:
      !domesticShipping &&
      safeSubtotal > 0,

    domesticShipping
  };
};