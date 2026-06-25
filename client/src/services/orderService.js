import api from "../api/axios";
import { getCustomerAccessToken } from "./customerAuthService";

const getCustomerOrderRequestConfig = () => {
  const customerAccessToken = getCustomerAccessToken();

  return {
    skipAdminAuth: true,
    ...(customerAccessToken
      ? {
          headers: {
            Authorization: `Bearer ${customerAccessToken}`,
          },
        }
      : {}),
  };
};

export const createOrderRequest = async (payload) => {
  const { data } = await api.post(
    "/orders",
    payload,
    getCustomerOrderRequestConfig()
  );
  return data;
};

export const trackOrderRequest = async ({ orderNumber, lookupToken }) => {
  const { data } = await api.post(
    "/orders/track",
    { orderNumber, lookupToken },
    { skipAdminAuth: true }
  );
  return data;
};

export const retryCustomerPaymobPaymentRequest = async ({
  orderNumber,
  lookupToken,
}) => {
  const { data } = await api.post(
    "/orders/paymob/retry",
    {
      orderNumber,
      lookupToken,
    },
    { skipAdminAuth: true }
  );

  return data;
};

export const getMyOrdersRequest = async (params = {}) => {
  const { data } = await api.get("/orders/mine", {
    ...getCustomerOrderRequestConfig(),
    params,
  });

  return data;
};

export const getMyOrderByIdRequest = async (orderId) => {
  const { data } = await api.get(
    `/orders/mine/${orderId}`,
    getCustomerOrderRequestConfig()
  );

  return data;
};

export const getAdminOrdersRequest = async (params = {}) => {
  const { data } = await api.get("/orders/admin", { params });
  return data;
};

export const getAdminOrderByIdRequest = async (orderId) => {
  const { data } = await api.get(`/orders/admin/${orderId}`);
  return data;
};

export const updateAdminOrderStatusRequest = async (orderId, payload) => {
  const { data } = await api.patch(`/orders/admin/${orderId}/status`, payload);
  return data;
};

export const updateAdminPaymentStatusRequest = async (
  orderId,
  paymentStatus
) => {
  const { data } = await api.patch(`/orders/admin/${orderId}/payment`, {
    paymentStatus,
  });
  return data;
};

export const retryAdminPaymobPaymentRequest = async (orderId) => {
  const { data } = await api.post(`/orders/admin/${orderId}/paymob/retry`);
  return data;
};
