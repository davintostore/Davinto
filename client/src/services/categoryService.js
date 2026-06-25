import api from "../api/axios";

export const getAdminCategoriesRequest = async () => {
  const { data } = await api.get("/categories/admin");
  return data;
};

export const getPublicCategoriesRequest = async () => {
  const { data } = await api.get("/categories");
  return data;
};

export const createCategoryRequest = async (payload) => {
  const { data } = await api.post("/categories/admin", payload);
  return data;
};

export const updateCategoryRequest = async (categoryId, payload) => {
  const { data } = await api.patch(`/categories/admin/${categoryId}`, payload);
  return data;
};

export const deleteCategoryRequest = async (categoryId) => {
  const { data } = await api.delete(`/categories/admin/${categoryId}`);
  return data;
};