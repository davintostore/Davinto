import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { AdminAuthContext } from "./adminAuthContext";
import {
  getAdminProfileRequest,
  loginAdminRequest,
} from "../services/adminAuthService";

const ADMIN_TOKEN_KEY = "davinto_admin_token";
const ADMIN_USER_KEY = "davinto_admin_user";

const readStoredAdmin = () => {
  try {
    const storedAdmin = localStorage.getItem(ADMIN_USER_KEY);
    return storedAdmin ? JSON.parse(storedAdmin) : null;
  } catch {
    localStorage.removeItem(ADMIN_USER_KEY);
    return null;
  }
};

export const AdminAuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(readStoredAdmin);
  const [token, setToken] = useState(() => localStorage.getItem(ADMIN_TOKEN_KEY));
  const [isCheckingAuth, setIsCheckingAuth] = useState(Boolean(token));

  const isAuthenticated = Boolean(admin && token);

  const saveSession = useCallback((nextToken, nextAdmin) => {
    localStorage.setItem(ADMIN_TOKEN_KEY, nextToken);
    localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(nextAdmin));

    setToken(nextToken);
    setAdmin(nextAdmin);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_USER_KEY);

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
