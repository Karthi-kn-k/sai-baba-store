const API_BASE = import.meta.env.VITE_API_BASE || "/api";

// Helpers to get/set tokens
export const getAccessToken = () => localStorage.getItem("accessToken");
export const getRefreshToken = () => localStorage.getItem("refreshToken");
export const setTokens = (access: string, refresh: string) => {
  localStorage.setItem("accessToken", access);
  localStorage.setItem("refreshToken", refresh);
};
export const clearTokens = () => {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
};

// Unified fetch handler
async function request(path: string, options: RequestInit = {}) {
  const token = getAccessToken();
  const headers = new Headers(options.headers || {});
  
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });

  const isAuthEndpoint = path.startsWith("/auth/login") || path.startsWith("/auth/signup") || path.startsWith("/auth/send-otp") || path.startsWith("/auth/verify-otp") || path.startsWith("/auth/reset-password");

  if (!isAuthEndpoint && response.status === 401 && getRefreshToken()) {
    // Attempt Token Refresh
    try {
      const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: getRefreshToken() })
      });
      if (refreshRes.ok) {
        const data = await refreshRes.json();
        setTokens(data.accessToken, data.refreshToken);
        
        // Retry original request with new token
        headers.set("Authorization", `Bearer ${data.accessToken}`);
        const retryResponse = await fetch(`${API_BASE}${path}`, {
          ...options,
          headers
        });
        if (!retryResponse.ok) {
          const errData = await retryResponse.json().catch(() => ({}));
          throw new Error(errData.message || "Request failed after token refresh");
        }
        return await retryResponse.json();
      } else {
        clearTokens();
        window.dispatchEvent(new Event("auth-expired"));
        throw new Error("Session expired. Please sign in again.");
      }
    } catch (refreshErr) {
      clearTokens();
      window.dispatchEvent(new Event("auth-expired"));
      throw new Error("Session expired. Please sign in again.");
    }
  }

  if (!isAuthEndpoint && response.status === 401) {
    clearTokens();
    window.dispatchEvent(new Event("auth-expired"));
    throw new Error("Authentication token missing or invalid. Redirecting...");
  }

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || "Invalid email/phone or password.");
  }

  // Handle empty JSON bodies
  const text = await response.text();
  return text ? JSON.parse(text) : {};
}

// 1. Auth API
export const authApi = {
  login: async (body: any) => request("/auth/login", { method: "POST", body: JSON.stringify(body) }),
  signup: async (body: any) => request("/auth/signup", { method: "POST", body: JSON.stringify(body) }),
  sendSignupOtp: async (body: any) => request("/auth/send-signup-otp", { method: "POST", body: JSON.stringify(body) }),
  logout: async () => {
    clearTokens();
    return request("/auth/logout", { method: "POST" });
  },
  getMe: async () => request("/auth/me"),
  sendOtp: async (body: { identifier: string; type: "LOGIN" | "RECOVERY" }) => 
    request("/auth/send-otp", { method: "POST", body: JSON.stringify(body) }),
  verifyOtpLogin: async (body: { identifier: string; otp: string }) => 
    request("/auth/verify-otp-login", { method: "POST", body: JSON.stringify(body) }),
  resetPasswordOtp: async (body: { identifier: string; otp: string; newPassword: string }) => 
    request("/auth/reset-password-otp", { method: "POST", body: JSON.stringify(body) }),
  updateProfile: async (body: { avatarUrl?: string | null }) =>
    request("/auth/profile", { method: "PATCH", body: JSON.stringify(body) })
};

// 2. Product API
export const productApi = {
  list: async (params?: { search?: string; category?: string; activeOnly?: boolean }) => {
    const query = new URLSearchParams();
    if (params?.search) query.append("search", params.search);
    if (params?.category) query.append("category", params.category);
    if (params?.activeOnly !== undefined) query.append("activeOnly", String(params.activeOnly));
    return request(`/products?${query.toString()}`);
  },
  get: async (id: string) => request(`/products/${id}`),
  create: async (body: any) => request("/products", { method: "POST", body: JSON.stringify(body) }),
  update: async (id: string, body: any) => request(`/products/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  delete: async (id: string) => request(`/products/${id}`, { method: "DELETE" })
};

// 3. Order API
export const orderApi = {
  place: async (body: { items: { productId: string; quantity: number }[]; paymentMethod: string }) => 
    request("/orders", { method: "POST", body: JSON.stringify(body) }),
  list: async () => request("/orders"),
  get: async (id: string) => request(`/orders/${id}`),
  updateStatus: async (id: string, status: string) => 
    request(`/orders/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) })
};

// 4. Ledger API
export const ledgerApi = {
  getLedger: async (customerId?: string) => {
    const query = customerId ? `?customerId=${customerId}` : "";
    return request(`/ledger/detail${query}`);
  },
  getSummary: async () => request("/ledger/summary"),
  getPendingVerifications: async () => request("/ledger/pending-verifications"),
  getNotebookRequests: async () => request("/ledger/notebook-requests"),
  requestNotebook: async () => request("/ledger/request-notebook", { method: "POST" }),
  approveNotebook: async (body: { customerId: string }) => 
    request("/ledger/approve-notebook", { method: "POST", body: JSON.stringify(body) }),
  recordCredit: async (body: { customerId: string; amount: number; note?: string }) => 
    request("/ledger/record-credit", { method: "POST", body: JSON.stringify(body) }),
  submitUpiRef: async (body: { orderId: string; upiTxnRef: string; amount?: number }) => 
    request("/ledger/upi-submit", { method: "POST", body: JSON.stringify(body) }),
  approvePayment: async (paymentId: string) => 
    request("/ledger/approve-payment", { method: "POST", body: JSON.stringify({ paymentId }) }),
  adjustEntry: async (body: { entryId: string; amount: number; type?: string; note?: string; reason: string }) => 
    request("/ledger/adjust-entry", { method: "POST", body: JSON.stringify(body) }),
  submitLedgerUpiSettle: async (body: { amount: number; upiTxnRef: string }) => 
    request("/ledger/upi-settle", { method: "POST", body: JSON.stringify(body) }),
  approveLedgerEntry: async (entryId: string) => 
    request("/ledger/approve-entry", { method: "POST", body: JSON.stringify({ entryId }) }),
  rejectLedgerEntry: async (entryId: string, reason: string) => 
    request("/ledger/reject-entry", { method: "POST", body: JSON.stringify({ entryId, reason }) })
};

// 5. Admin API
export const adminApi = {
  getNotifications: async () => request("/admin/notifications"),
  clearNotifications: async () => request("/admin/notifications/clear", { method: "POST" })
};
