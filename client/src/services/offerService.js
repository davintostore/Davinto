import api from "../api/axios";

export const getPublicOffersRequest = async () => {
  const { data } = await api.get("/offers");
  return data;
};

export const getAdminOffersRequest = async (params = {}) => {
  const { data } = await api.get("/offers/admin", { params });
  return data;
};

export const createOfferRequest = async (payload) => {
  const { data } = await api.post("/offers/admin", payload);
  return data;
};

export const updateOfferRequest = async (offerId, payload) => {
  const { data } = await api.patch(`/offers/admin/${offerId}`, payload);
  return data;
};

export const deleteOfferRequest = async (offerId) => {
  const { data } = await api.delete(`/offers/admin/${offerId}`);
  return data;
};