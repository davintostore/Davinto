import api from "../api/axios";

export const sendAdminTestEmailRequest = async (payload = {}) => {
  const { data } = await api.post("/notifications/admin/test-email", payload);
  return data;
};