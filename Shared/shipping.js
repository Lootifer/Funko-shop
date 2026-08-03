export const STANDARD_SHIPPING_COST = 6.95;
export const FREE_SHIPPING_THRESHOLD = 75;

const toMoney = (value) => Math.round((Number(value) || 0) * 100) / 100;

export const calculateShippingCost = (subtotal) => {
  const safeSubtotal = Math.max(0, toMoney(subtotal));
  if (safeSubtotal <= 0 || safeSubtotal >= FREE_SHIPPING_THRESHOLD) return 0;
  return STANDARD_SHIPPING_COST;
};

export const calculateOrderTotals = (subtotal) => {
  const safeSubtotal = Math.max(0, toMoney(subtotal));
  const shippingCost = calculateShippingCost(safeSubtotal);
  return {
    subtotal: safeSubtotal,
    shippingCost,
    total: toMoney(safeSubtotal + shippingCost),
    amountUntilFreeShipping: Math.max(0, toMoney(FREE_SHIPPING_THRESHOLD - safeSubtotal)),
    hasFreeShipping: safeSubtotal > 0 && shippingCost === 0,
  };
};
