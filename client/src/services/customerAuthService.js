import axios from "axios";
export {
  CUSTOMER_ACCESS_TOKEN_KEY,
  CUSTOMER_PROFILE_KEY,
  CUSTOMER_REFRESH_TOKEN_KEY,
  clearCustomerSessionStorage,
  readStoredCustomerProfile,
  saveCustomerSessionStorage,
} from "../utils/authSessionStorage";
import { CUSTOMER_ACCESS_TOKEN_KEY } from "../utils/authSessionStorage";

const customerAuthApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export const getCustomerAccessToken = () => {
  return localStorage.getItem(CUSTOMER_ACCESS_TOKEN_KEY) || "";
};

customerAuthApi.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error?.response?.data?.message ||
      error?.message ||
      "Something went wrong.";

    error.friendlyMessage = message;
    return Promise.reject(error);
  }
);

const withCustomerAuthorization = () => {
  const accessToken = getCustomerAccessToken();

  if (!accessToken) {
    return {};
  }

  return {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  };
};

export const signupCustomerRequest = async (payload) => {
  const { data } = await customerAuthApi.post("/customer-auth/signup", payload);
  return data;
};

export const signinCustomerRequest = async (payload) => {
  const { data } = await customerAuthApi.post("/customer-auth/signin", payload);
  return data;
};

export const refreshCustomerTokenRequest = async (refreshToken) => {
  const { data } = await customerAuthApi.post("/customer-auth/refresh", {
    refreshToken,
  });
  return data;
};

export const signoutCustomerRequest = async () => {
  const { data } = await customerAuthApi.post(
    "/customer-auth/signout",
    {},
    withCustomerAuthorization()
  );
  return data;
};

export const getCustomerMeRequest = async () => {
  const { data } = await customerAuthApi.get(
    "/customer-auth/me",
    withCustomerAuthorization()
  );
  return data;
};

export const updateCustomerMeRequest = async (payload) => {
  const { data } = await customerAuthApi.patch(
    "/customer-auth/me",
    payload,
    withCustomerAuthorization()
  );
  return data;
};
