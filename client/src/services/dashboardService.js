import api from "../api/axios";

export const getAdminDashboardStatsRequest = async () => {
  const { data } = await api.get("/dashboard/admin");
  return data;
};