import api from "../api/axios";

export const getPublicPaymobConfigRequest = async () => {
  const { data } = await api.get("/paymob/config");
  return data;
};