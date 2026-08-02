const API_BASE = (typeof window !== "undefined" && window.LOOTIFER_API_BASE)
  ? String(window.LOOTIFER_API_BASE).replace(/\/$/, "")
  : "http://localhost:3001/api";

const requestJson = async (path, options = {}) => {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    let details = "";
    try {
      const body = await response.json();
      details = body?.error || body?.details || "";
    } catch {
      details = "";
    }

    const suffix = details ? `: ${details}` : "";
    throw new Error(`API ${response.status}${suffix}`);
  }

  return response.json();
};

export const isApiReachable = async () => {
  try {
    const health = await requestJson("/health", { method: "GET" });
    return Boolean(health?.ok);
  } catch {
    return false;
  }
};

export const fetchProductsFromApi = async () => {
  const payload = await requestJson("/products", { method: "GET" });
  return Array.isArray(payload?.products) ? payload.products : [];
};

export const fetchProductByIdentifier = async (idOrSlug) => {
  const payload = await requestJson(`/products/${encodeURIComponent(String(idOrSlug))}`, { method: "GET" });
  return payload?.product || null;
};

export const fetchOrdersFromApi = async () => {
  const payload = await requestJson("/orders", { method: "GET" });
  return Array.isArray(payload?.orders) ? payload.orders : [];
};

export const createOrderInApi = async (orderPayload) => {
  const payload = await requestJson("/orders", {
    method: "POST",
    body: JSON.stringify(orderPayload || {}),
  });
  return payload?.order || null;
};

export const updateOrderStatusInApi = async (orderId, status) => {
  const payload = await requestJson(`/orders/${encodeURIComponent(String(orderId))}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  return payload?.order || null;
};

export const adjustStockInApi = async ({ items = [], mode = "decrease", reason = "manual-adjustment", note = "" } = {}) => {
  const payload = await requestJson("/stock/adjust", {
    method: "POST",
    body: JSON.stringify({ items, mode, reason, note }),
  });

  return {
    warnings: Array.isArray(payload?.warnings) ? payload.warnings : [],
    changes: Array.isArray(payload?.changes) ? payload.changes : [],
    products: Array.isArray(payload?.products) ? payload.products : [],
  };
};

export const fetchStockTransactionsFromApi = async (limit = 50) => {
  const payload = await requestJson(`/stock/transactions?limit=${encodeURIComponent(String(limit))}`, { method: "GET" });
  return Array.isArray(payload?.transactions) ? payload.transactions : [];
};
