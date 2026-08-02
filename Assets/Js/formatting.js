const currencyFormatter = new Intl.NumberFormat("nl-NL", {
  style: "currency",
  currency: "EUR",
});

const quantityFormatter = new Intl.NumberFormat("nl-NL");

export const formatCurrency = (value = 0) => currencyFormatter.format(Number(value) || 0);

export const formatQuantity = (value = 0) => quantityFormatter.format(Number(value) || 0);