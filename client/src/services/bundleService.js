import api from "../api/axios";

export const getPublicBundlesRequest = async () => {
  const { data } = await api.get("/bundles");
  return data;
};

export const getAdminBundlesRequest = async (params = {}) => {
  const { data } = await api.get("/bundles/admin", { params });
  return data;
};

export const createBundleRequest = async (payload) => {
  const { data } = await api.post("/bundles/admin", payload);
  return data;
};

export const updateBundleRequest = async (bundleId, payload) => {
  const { data } = await api.patch(`/bundles/admin/${bundleId}`, payload);
  return data;
};

export const deleteBundleRequest = async (bundleId) => {
  const { data } = await api.delete(`/bundles/admin/${bundleId}`);
  return data;
};