import api from "./index.jsx";

export const getInvoiceProducts = async (params = {}) => {
  const response = await api.get("/api/admin/invoice-products", { params });
  return response.data;
};

export const getInvoiceProduct = async (id) => {
  const response = await api.get(
    `/api/admin/invoice-products/${encodeURIComponent(id)}`,
  );
  return response.data;
};

export const createInvoiceProduct = async (payload) => {
  const response = await api.post("/api/admin/invoice-products", payload);
  return response.data;
};

export const updateInvoiceProduct = async (id, payload) => {
  const response = await api.put(
    `/api/admin/invoice-products/${encodeURIComponent(id)}`,
    payload,
  );
  return response.data;
};

export const archiveInvoiceProduct = async (id) => {
  const response = await api.post(
    `/api/admin/invoice-products/${encodeURIComponent(id)}/archive`,
  );
  return response.data;
};

export const unarchiveInvoiceProduct = async (id) => {
  const response = await api.post(
    `/api/admin/invoice-products/${encodeURIComponent(id)}/unarchive`,
  );
  return response.data;
};

export const deleteInvoiceProduct = async (id) => {
  const response = await api.delete(
    `/api/admin/invoice-products/${encodeURIComponent(id)}`,
  );
  return response.data;
};
