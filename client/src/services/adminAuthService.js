import api from "../api/axios";

export const loginAdminRequest = async (credentials) => {
  const { data } = await api.post("/auth/admin/login", credentials);
  return data;
};

export const getAdminProfileRequest = async () => {
  const { data } = await api.get("/auth/admin/me");
  return data;
};