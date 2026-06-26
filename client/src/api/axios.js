import axios from "axios";
import { ADMIN_TOKEN_KEY } from "../utils/authSessionStorage";

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
    const requestPath = String(config.url || "");
    const isCustomerAuthRequest = requestPath.startsWith("/customer-auth");
    const hasAuthorizationHeader = Boolean(config.headers?.Authorization);

    if (
      adminToken &&
      !isCustomerAuthRequest &&
      !config.skipAdminAuth &&
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
