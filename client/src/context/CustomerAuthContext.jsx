import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { CustomerAuthContext } from "./customerAuthContext";
import {
  CUSTOMER_ACCESS_TOKEN_KEY,
  CUSTOMER_REFRESH_TOKEN_KEY,
  clearCustomerSessionStorage,
  getCustomerMeRequest,
  readStoredCustomerProfile,
  refreshCustomerTokenRequest,
  saveCustomerSessionStorage,
  signinCustomerRequest,
  signoutCustomerRequest,
  signupCustomerRequest,
  updateCustomerMeRequest,
} from "../services/customerAuthService";

const readStoredToken = (key) => localStorage.getItem(key) || "";

const validateAuthResponse = (response) => {
  if (
    !response?.customer ||
    !response?.accessToken ||
    !response?.refreshToken
  ) {
    throw new Error("Invalid customer authentication response.");
  }

  return response;
};

export const CustomerAuthProvider = ({ children }) => {
  const initialAccessToken = readStoredToken(CUSTOMER_ACCESS_TOKEN_KEY);
  const initialRefreshToken = readStoredToken(CUSTOMER_REFRESH_TOKEN_KEY);

  const [customer, setCustomer] = useState(readStoredCustomerProfile);
  const [accessToken, setAccessToken] = useState(initialAccessToken);
  const [refreshToken, setRefreshToken] = useState(initialRefreshToken);
  const [isCustomerLoading, setIsCustomerLoading] = useState(
    Boolean(initialAccessToken || initialRefreshToken)
  );

  const bootstrapStartedRef = useRef(false);

  const isCustomerAuthenticated = Boolean(customer && accessToken);

  const setSession = useCallback((response) => {
    const validResponse = validateAuthResponse(response);

    saveCustomerSessionStorage(validResponse);
    setCustomer(validResponse.customer);
    setAccessToken(validResponse.accessToken);
    setRefreshToken(validResponse.refreshToken);

    return validResponse.customer;
  }, []);

  const clearSession = useCallback(() => {
    clearCustomerSessionStorage();
    setCustomer(null);
    setAccessToken("");
    setRefreshToken("");
  }, []);

  const refreshSession = useCallback(
    async (tokenOverride = "") => {
      const token =
        tokenOverride ||
        refreshToken ||
        readStoredToken(CUSTOMER_REFRESH_TOKEN_KEY);

      if (!token) {
        clearSession();
        return null;
      }

      try {
        const response = await refreshCustomerTokenRequest(token);
        return setSession(response);
      } catch (error) {
        clearSession();
        throw error;
      }
    },
    [clearSession, refreshToken, setSession]
  );

  const signup = useCallback(
    async (payload) => {
      const response = await signupCustomerRequest(payload);
      return setSession(response);
    },
    [setSession]
  );

  const signin = useCallback(
    async (payload) => {
      const response = await signinCustomerRequest(payload);
      return setSession(response);
    },
    [setSession]
  );

  const signout = useCallback(async () => {
    try {
      if (readStoredToken(CUSTOMER_ACCESS_TOKEN_KEY)) {
        await signoutCustomerRequest();
      }
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const updateProfile = useCallback(
    async (payload) => {
      try {
        const response = await updateCustomerMeRequest(payload);

        if (!response?.customer) {
          throw new Error("Invalid customer profile response.");
        }

        saveCustomerSessionStorage({ customer: response.customer });
        setCustomer(response.customer);

        return response.customer;
      } catch (error) {
        if (error?.response?.status !== 401 || !refreshToken) {
          throw error;
        }

        await refreshSession();

        const retryResponse = await updateCustomerMeRequest(payload);

        if (!retryResponse?.customer) {
          throw new Error("Invalid customer profile response.", {
            cause: error,
          });
        }

        saveCustomerSessionStorage({ customer: retryResponse.customer });
        setCustomer(retryResponse.customer);

        return retryResponse.customer;
      }
    },
    [refreshSession, refreshToken]
  );

  useEffect(() => {
    if (bootstrapStartedRef.current) return;
    bootstrapStartedRef.current = true;

    const restoreSession = async () => {
      const storedAccessToken = readStoredToken(CUSTOMER_ACCESS_TOKEN_KEY);
      const storedRefreshToken = readStoredToken(CUSTOMER_REFRESH_TOKEN_KEY);

      if (!storedAccessToken && !storedRefreshToken) {
        clearSession();
        setIsCustomerLoading(false);
        return;
      }

      if (storedAccessToken) {
        try {
          const response = await getCustomerMeRequest();

          if (!response?.customer) {
            throw new Error("Invalid customer profile response.");
          }

          saveCustomerSessionStorage({ customer: response.customer });
          setCustomer(response.customer);
          setAccessToken(storedAccessToken);
          setRefreshToken(storedRefreshToken);
          setIsCustomerLoading(false);
          return;
        } catch {
          if (storedRefreshToken) {
            try {
              await refreshSession(storedRefreshToken);
              setIsCustomerLoading(false);
              return;
            } catch {
              clearSession();
            }
          } else {
            clearSession();
          }
        }
      } else if (storedRefreshToken) {
        try {
          await refreshSession(storedRefreshToken);
        } catch {
          clearSession();
        }
      }

      setIsCustomerLoading(false);
    };

    restoreSession();
  }, [clearSession, refreshSession]);

  const value = useMemo(
    () => ({
      customer,
      accessToken,
      refreshToken,
      isCustomerAuthenticated,
      isCustomerLoading,
      signup,
      signin,
      signout,
      refreshSession,
      updateProfile,
      setCustomer,
      clearSession,
    }),
    [
      customer,
      accessToken,
      refreshToken,
      isCustomerAuthenticated,
      isCustomerLoading,
      signup,
      signin,
      signout,
      refreshSession,
      updateProfile,
      clearSession,
    ]
  );

  return (
    <CustomerAuthContext.Provider value={value}>
      {children}
    </CustomerAuthContext.Provider>
  );
};
