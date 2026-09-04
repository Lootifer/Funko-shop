const RAILWAY_API = "https://api.2ndlifetoys.nl/api";

const isLocal =
  typeof window !== "undefined" &&
  ["localhost", "127.0.0.1"].includes(window.location.hostname);

const API_BASE =
  typeof window !== "undefined" && window.LOOTIFER_API_BASE
    ? String(window.LOOTIFER_API_BASE).replace(/\/$/, "")
    : isLocal
      ? "http://localhost:3001/api"
      : RAILWAY_API;

export const SERVER_UNREACHABLE_MESSAGE =
  "De server is niet bereikbaar. Probeer het later opnieuw.";

export class ApiClientError extends Error {
  constructor(message, { status = 0, offline = false, details = [] } = {}) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.offline = offline;
    this.details = Array.isArray(details) ? details : [];
  }
}

const requestJson = async (path, options = {}) => {
  let response;

  try {
    response = await fetch(`${API_BASE}${path}`, {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      ...options,
    });
  } catch {
    throw new ApiClientError(
      SERVER_UNREACHABLE_MESSAGE,
      { offline: true }
    );
  }

  if (!response.ok) {
    let message = `API ${response.status}`;
    let details = [];

    try {
      const body = await response.json();
      message = body?.error || body?.details || message;
      details = Array.isArray(body?.details) ? body.details : [];
    } catch {
      message = `API ${response.status}`;
    }

    throw new ApiClientError(message, {
      status: response.status,
      details,
    });
  }

  return response.json();
};

export const isApiReachable = async () => {
  try {
    const health = await requestJson("/health", {
      method: "GET",
    });

    return Boolean(health?.ok);
  } catch {
    return false;
  }
};

export const fetchAdminAuthStatus = async () =>
  requestJson("/auth/status", {
    method: "GET",
  });

export const loginAdmin = async (username, password) =>
  requestJson("/auth/login", {
    method: "POST",
    body: JSON.stringify({
      username,
      password,
    }),
  });

export const logoutAdmin = async () =>
  requestJson("/auth/logout", {
    method: "POST",
    body: "{}",
  });

export const downloadDatabaseBackupFromApi = async () => {
  let response;

  try {
    response = await fetch(`${API_BASE}/site/backup`, {
      method: "GET",
      credentials: "include",
    });
  } catch {
    throw new ApiClientError(
      SERVER_UNREACHABLE_MESSAGE,
      { offline: true }
    );
  }

  if (!response.ok) {
    let message = `API ${response.status}`;

    try {
      const body = await response.json();
      message = body?.error || body?.details || message;
    } catch {
      // Binary endpoint may not return JSON on every server error.
    }

    throw new ApiClientError(message, {
      status: response.status,
    });
  }

  return response.blob();
};

export const fetchProductsFromApi = async () => {
  const payload = await requestJson("/products", {
    method: "GET",
    cache: "no-store",
  });

  return Array.isArray(payload?.products)
    ? payload.products
    : [];
};

export const fetchProductByIdentifier = async (idOrSlug) => {
  const payload = await requestJson(
    `/products/${encodeURIComponent(String(idOrSlug))}`,
    {
      method: "GET",
    }
  );

  return payload?.product || null;
};

export const createProductInApi = async (productPayload) => {
  const payload = await requestJson("/products", {
    method: "POST",
    body: JSON.stringify(productPayload || {}),
  });

  return payload?.product || null;
};

export const updateProductInApi = async (
  productId,
  productPayload
) => {
  const payload = await requestJson(
    `/products/${encodeURIComponent(String(productId))}`,
    {
      method: "PUT",
      body: JSON.stringify(productPayload || {}),
    }
  );

  return payload?.product || null;
};

export const updateProductStockInApi = async (
  productId,
  stock
) => {
  const payload = await requestJson(
    `/products/${encodeURIComponent(String(productId))}/stock`,
    {
      method: "PATCH",
      body: JSON.stringify({ stock }),
    }
  );

  return payload?.product || null;
};

export const updateProductArchiveInApi = async (
  productId,
  archived
) => {
  const payload = await requestJson(
    `/products/${encodeURIComponent(String(productId))}/archive`,
    {
      method: "PATCH",
      body: JSON.stringify({ archived }),
    }
  );

  return payload?.product || null;
};

export const deleteProductInApi = async (productId) => {
  const payload = await requestJson(
    `/products/${encodeURIComponent(String(productId))}`,
    {
      method: "DELETE",
    }
  );

  return {
    deleted: Boolean(payload?.deleted),
    detachedOrderItems:
      Number(payload?.detachedOrderItems) || 0,
  };
};

export const fetchOrdersFromApi = async () => {
  const payload = await requestJson("/orders", {
    method: "GET",
  });

  return Array.isArray(payload?.orders)
    ? payload.orders
    : [];
};

export const createOrderInApi = async (orderPayload) => {
  const payload = await requestJson("/orders", {
    method: "POST",
    body: JSON.stringify(orderPayload || {}),
  });

  return payload?.order || null;
};

export const fetchOrderByNumberFromApi = async (
  orderNumber
) => {
  const payload = await requestJson(
    `/orders/${encodeURIComponent(String(orderNumber))}`,
    {
      method: "GET",
    }
  );

  return payload?.order || null;
};

export const updateOrderStatusInApi = async (
  orderNumber,
  status
) => {
  const payload = await requestJson(
    `/orders/${encodeURIComponent(String(orderNumber))}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }
  );

  return payload?.order || null;
};

export const deleteOrderInApi = async (orderNumber) => {
  const payload = await requestJson(
    `/orders/${encodeURIComponent(String(orderNumber))}`,
    {
      method: "DELETE",
    }
  );

  return Boolean(payload?.deleted);
};

export const fetchCustomersFromApi = async () => {
  const payload = await requestJson("/customers", {
    method: "GET",
  });

  return Array.isArray(payload?.customers)
    ? payload.customers
    : [];
};

export const fetchCustomerByIdFromApi = async (customerId) => {
  const payload = await requestJson(
    `/customers/${encodeURIComponent(String(customerId))}`,
    {
      method: "GET",
    }
  );

  return payload?.customer || null;
};

export const adjustStockInApi = async ({
  items = [],
  mode = "decrease",
  reason = "manual-adjustment",
  note = "",
} = {}) => {
  const payload = await requestJson("/stock/adjust", {
    method: "POST",
    body: JSON.stringify({
      items,
      mode,
      reason,
      note,
    }),
  });

  return {
    warnings: Array.isArray(payload?.warnings)
      ? payload.warnings
      : [],
    changes: Array.isArray(payload?.changes)
      ? payload.changes
      : [],
    products: Array.isArray(payload?.products)
      ? payload.products
      : [],
  };
};

export const fetchStockTransactionsFromApi = async (
  limit = 50
) => {
  const payload = await requestJson(
    `/stock/transactions?limit=${encodeURIComponent(String(limit))}`,
    {
      method: "GET",
    }
  );

  return Array.isArray(payload?.transactions)
    ? payload.transactions
    : [];
};