import api from "../api/axios";

export const getAdminDiscountCodesRequest = async (params = {}) => {
  const { data } = await api.get("/discount-codes/admin", { params });
  return data;
};

export const createDiscountCodeRequest = async (payload) => {
  const { data } = await api.post("/discount-codes/admin", payload);
  return data;
};

export const updateDiscountCodeRequest = async (discountCodeId, payload) => {
  const { data } = await api.patch(
    `/discount-codes/admin/${discountCodeId}`,
    payload
  );

  return data;
};

export const deleteDiscountCodeRequest = async (discountCodeId) => {
  const { data } = await api.delete(`/discount-codes/admin/${discountCodeId}`);
  return data;
};

export const validateDiscountCodeRequest = async (payload) => {
  const { data } = await api.post("/discount-codes/validate", payload);
  return data;
};