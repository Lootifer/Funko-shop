export const createBadge = (product) => {
  if (product.exclusive) return "Exclusive";
  if (product.chase) return "Chase";
  if (product.vaulted) return "Vaulted";
  if (product.signed) return "Signed";
  return "New";
};
