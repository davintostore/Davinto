export const ADMIN_TOKEN_KEY = "davinto_admin_token";
export const ADMIN_USER_KEY = "davinto_admin_user";

export const CUSTOMER_ACCESS_TOKEN_KEY = "davinto_customer_access_token";
export const CUSTOMER_REFRESH_TOKEN_KEY = "davinto_customer_refresh_token";
export const CUSTOMER_PROFILE_KEY = "davinto_customer_profile";

export const AUTH_SESSION_EVENTS = {
  adminCleared: "davinto:admin-session-cleared",
  customerCleared: "davinto:customer-session-cleared",
};

const getStorage = () => {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
};

const emitSessionEvent = (eventName) => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(eventName));
  }
};

const readJsonValue = (key) => {
  const storage = getStorage();

  if (!storage) {
    return null;
  }

  try {
    const storedValue = storage.getItem(key);
    return storedValue ? JSON.parse(storedValue) : null;
  } catch {
    storage.removeItem(key);
    return null;
  }
};

export const hasAdminSessionStorage = () => {
  const storage = getStorage();
  return Boolean(storage?.getItem(ADMIN_TOKEN_KEY));
};

export const hasCustomerSessionStorage = () => {
  const storage = getStorage();

  return Boolean(
    storage?.getItem(CUSTOMER_ACCESS_TOKEN_KEY) ||
      storage?.getItem(CUSTOMER_REFRESH_TOKEN_KEY) ||
      storage?.getItem(CUSTOMER_PROFILE_KEY)
  );
};

export const readStoredAdmin = () => readJsonValue(ADMIN_USER_KEY);

export const saveAdminSessionStorage = ({ token, admin }) => {
  const storage = getStorage();

  if (!storage) {
    return;
  }

  storage.setItem(ADMIN_TOKEN_KEY, token);
  storage.setItem(ADMIN_USER_KEY, JSON.stringify(admin));
};

export const clearAdminSessionStorage = ({ notify = true } = {}) => {
  const storage = getStorage();

  if (!storage) {
    return;
  }

  storage.removeItem(ADMIN_TOKEN_KEY);
  storage.removeItem(ADMIN_USER_KEY);

  if (notify) {
    emitSessionEvent(AUTH_SESSION_EVENTS.adminCleared);
  }
};

export const readStoredCustomerProfile = () => readJsonValue(CUSTOMER_PROFILE_KEY);

export const saveCustomerSessionStorage = ({
  customer,
  accessToken,
  refreshToken,
}) => {
  const storage = getStorage();

  if (!storage) {
    return;
  }

  if (accessToken) {
    storage.setItem(CUSTOMER_ACCESS_TOKEN_KEY, accessToken);
  }

  if (refreshToken) {
    storage.setItem(CUSTOMER_REFRESH_TOKEN_KEY, refreshToken);
  }

  if (customer) {
    storage.setItem(CUSTOMER_PROFILE_KEY, JSON.stringify(customer));
  }
};

export const clearCustomerSessionStorage = ({ notify = true } = {}) => {
  const storage = getStorage();

  if (!storage) {
    return;
  }

  storage.removeItem(CUSTOMER_ACCESS_TOKEN_KEY);
  storage.removeItem(CUSTOMER_REFRESH_TOKEN_KEY);
  storage.removeItem(CUSTOMER_PROFILE_KEY);

  if (notify) {
    emitSessionEvent(AUTH_SESSION_EVENTS.customerCleared);
  }
};
