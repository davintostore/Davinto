import api from "../api/axios";

export const createQuoteRequest = async (payload) => {
  const { data } = await api.post("/quote", payload);
  return data;
};