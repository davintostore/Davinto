import axios from "axios";
import { ADMIN_TOKEN_KEY } from "../utils/authSessionStorage";

const ADMIN_AUTH_PATH_PREFIXES = [
  "/auth/admin/me",
  "/bundles/admin",
  "/categories/admin",
  "/dashboard/admin",
  "/discount-codes/admin",
  "/notifications/admin",
  "/offers/admin",
  "/orders/admin",
  "/products/admin",
  "/settings/admin",
  "/uploads",
];

const getRequestPath = (url = "") => {
  try {
    const parsedUrl = new URL(String(url || ""), "https://davinto.local");
    return parsedUrl.pathname.replace(/^\/api(?=\/|$)/, "") || "/";
  } catch {
    return String(url || "").split("?")[0].split("#")[0] || "/";
  }
};

const shouldAttachAdminToken = (config) => {
  if (config.skipAdminAuth) return false;

  const requestPath = getRequestPath(config.url);

  // Admin bearer tokens are deliberately limited to protected admin/upload
  // endpoints so public storefront requests never carry admin credentials.
  return ADMIN_AUTH_PATH_PREFIXES.some(
    (path) => requestPath === path || requestPath.startsWith(`${path}/`)
  );
};

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    const adminToken = localStorage.getItem(ADMIN_TOKEN_KEY);
    config.headers = config.headers || {};

    const hasAuthorizationHeader = Boolean(
      config.headers.Authorization || config.headers.authorization
    );

    if (
      adminToken &&
      shouldAttachAdminToken(config) &&
      !hasAuthorizationHeader
    ) {
      config.headers.Authorization = `Bearer ${adminToken}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error?.response?.data?.message ||
      error?.message ||
      "Something went wrong.";

    return Promise.reject({
      ...error,
      friendlyMessage: message,
    });
  }
);

export default api;
