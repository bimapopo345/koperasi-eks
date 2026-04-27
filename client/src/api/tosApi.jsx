import api from "./index.jsx";

export const getTosList = async (params = {}) => {
  const response = await api.get("/api/admin/tos", { params });
  return response.data;
};

export const getTos = async (id) => {
  const response = await api.get(`/api/admin/tos/${encodeURIComponent(id)}`);
  return response.data;
};

export const createTos = async (payload) => {
  const response = await api.post("/api/admin/tos", payload);
  return response.data;
};

export const updateTos = async (id, payload) => {
  const response = await api.put(
    `/api/admin/tos/${encodeURIComponent(id)}`,
    payload,
  );
  return response.data;
};

export const archiveTos = async (id) => {
  const response = await api.post(
    `/api/admin/tos/${encodeURIComponent(id)}/archive`,
  );
  return response.data;
};

export const unarchiveTos = async (id) => {
  const response = await api.post(
    `/api/admin/tos/${encodeURIComponent(id)}/unarchive`,
  );
  return response.data;
};

export const deleteTos = async (id) => {
  const response = await api.delete(`/api/admin/tos/${encodeURIComponent(id)}`);
  return response.data;
};
