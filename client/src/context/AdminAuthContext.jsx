import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useQueryClient } from "@tanstack/react-query";

import { AdminAuthContext } from "./adminAuthContext";
import {
  getAdminProfileRequest,
  loginAdminRequest,
} from "../services/adminAuthService";
import {
  ADMIN_TOKEN_KEY,
  ADMIN_USER_KEY,
  AUTH_SESSION_EVENTS,
  clearAdminSessionStorage,
  clearCustomerSessionStorage,
  readStoredAdmin,
  saveAdminSessionStorage,
} from "../utils/authSessionStorage";

export const AdminAuthProvider = ({ children }) => {
  const queryClient = useQueryClient();
  const [admin, setAdmin] = useState(readStoredAdmin);
  const [token, setToken] = useState(() => localStorage.getItem(ADMIN_TOKEN_KEY));
  const [isCheckingAuth, setIsCheckingAuth] = useState(Boolean(token));

  const isAuthenticated = Boolean(admin && token);

  const saveSession = useCallback((nextToken, nextAdmin) => {
    clearCustomerSessionStorage();
    queryClient.removeQueries({
      predicate: ({ queryKey }) => String(queryKey[0] || "").startsWith("customer"),
    });
    saveAdminSessionStorage({ token: nextToken, admin: nextAdmin });

    setToken(nextToken);
    setAdmin(nextAdmin);
  }, [queryClient]);

  const logout = useCallback(() => {
    clearAdminSessionStorage();

    setToken(null);
    setAdmin(null);
  }, []);

  const login = useCallback(
    async ({ email, password }) => {
      const response = await loginAdminRequest({ email, password });

      if (!response?.token || !response?.admin) {
        throw new Error("Invalid login response.");
      }

      saveSession(response.token, response.admin);

      return response.admin;
    },
    [saveSession]
  );

  const refreshAdmin = useCallback(async () => {
    const storedToken = localStorage.getItem(ADMIN_TOKEN_KEY);

    if (!storedToken) {
      logout();
      return null;
    }

    const response = await getAdminProfileRequest();

    if (!response?.admin) {
      logout();
      return null;
    }

    localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(response.admin));
    setAdmin(response.admin);
    setToken(storedToken);

    return response.admin;
  }, [logout]);

  useEffect(() => {
    const checkSession = async () => {
      const storedToken = localStorage.getItem(ADMIN_TOKEN_KEY);

      if (!storedToken) {
        setIsCheckingAuth(false);
        return;
      }

      try {
        await refreshAdmin();
      } catch {
        logout();
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkSession();
  }, [logout, refreshAdmin]);

  useEffect(() => {
    const handleAdminCleared = () => {
      setToken(null);
      setAdmin(null);
      setIsCheckingAuth(false);
    };

    window.addEventListener(AUTH_SESSION_EVENTS.adminCleared, handleAdminCleared);

    return () => {
      window.removeEventListener(
        AUTH_SESSION_EVENTS.adminCleared,
        handleAdminCleared
      );
    };
  }, []);

  const value = useMemo(
    () => ({
      admin,
      token,
      isAuthenticated,
      isCheckingAuth,
      login,
      logout,
      refreshAdmin,
    }),
    [admin, token, isAuthenticated, isCheckingAuth, login, logout, refreshAdmin]
  );

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
};
