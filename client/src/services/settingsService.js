import api from "../api/axios";

export const getPublicSettingsRequest = async () => {
  const { data } = await api.get("/settings/public");
  return data;
};

export const getAdminSettingsRequest = async () => {
  const { data } = await api.get("/settings/admin");
  return data;
};

export const updateAdminSettingsRequest = async (payload) => {
  const { data } = await api.patch("/settings/admin", payload);
  return data;
};