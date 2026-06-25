import api from "../api/axios";

export const uploadImageRequest = async (file, options = {}) => {
  const formData = new FormData();

  formData.append("image", file);
  formData.append("folder", options.folder || "products");

  const { data } = await api.post("/uploads/image", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return data;
};

export const deleteUploadedImageRequest = async (publicId) => {
  const { data } = await api.delete("/uploads/image", {
    data: {
      publicId,
    },
  });

  return data;
};