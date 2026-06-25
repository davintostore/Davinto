import api from "../api/axios";

export const getPublicProductsRequest = async (params = {}) => {
  const { data } = await api.get("/products", { params });
  return data;
};

export const getPublicProductBySlugRequest = async (slug) => {
  const { data } = await api.get(`/products/${slug}`);
  return data;
};

export const getAdminProductsRequest = async (params = {}) => {
  const { data } = await api.get("/products/admin", { params });
  return data;
};

export const getAdminProductByIdRequest = async (productId) => {
  const { data } = await api.get(`/products/admin/${productId}`);
  return data;
};

export const createProductRequest = async (payload) => {
  const { data } = await api.post("/products/admin", payload);
  return data;
};

export const updateProductRequest = async (productId, payload) => {
  const { data } = await api.patch(`/products/admin/${productId}`, payload);
  return data;
};

export const updateProductStatusRequest = async (productId, status) => {
  const { data } = await api.patch(`/products/admin/${productId}/status`, {
    status,
  });

  return data;
};

export const deleteProductRequest = async (productId) => {
  const { data } = await api.delete(`/products/admin/${productId}`);
  return data;
};