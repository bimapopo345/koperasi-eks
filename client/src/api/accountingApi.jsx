import axios from "axios";
import { API_URL } from "./config";

const api = axios.create({
  baseURL: `${API_URL}/api/admin`,
  withCredentials: true,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ========================
// Chart of Accounts
// ========================

export const getAccountsByType = async (type = "Assets") => {
  const res = await api.get(`/coa/${type}`);
  return res.data;
};

export const getAccountDetail = async (id) => {
  const res = await api.get(`/coa/account/${id}`);
  return res.data;
};

export const createAccount = async (data) => {
  const res = await api.post("/coa/account", data);
  return res.data;
};

export const updateAccount = async (id, data) => {
  const res = await api.put(`/coa/account/${id}`, data);
  return res.data;
};

export const deleteAccount = async (id) => {
  const res = await api.delete(`/coa/account/${id}`);
  return res.data;
};

export const getSubmenusByMasterType = async (masterType) => {
  const res = await api.get(`/coa/submenus/${masterType}`);
  return res.data;
};

export const getAllCategories = async () => {
  const res = await api.get("/coa/categories");
  return res.data;
};

export const getAssetsAccounts = async () => {
  const res = await api.get("/coa/assets-accounts");
  return res.data;
};

export const getMembers = async (verified = "") => {
  const params = verified ? `?verified=${verified}` : "";
  const res = await api.get(`/members${params}`);
  return res.data;
};

// ========================
// Transactions
// ========================

export const getTransactions = async (accountId = null) => {
  const params = accountId ? `?account=${accountId}` : "";
  const res = await api.get(`/transactions${params}`);
  return res.data;
};

export const getTransaction = async (id) => {
  const res = await api.get(`/transactions/${id}`);
  return res.data;
};

export const createTransaction = async (data) => {
  const res = await api.post("/transactions", data, {
    headers: data instanceof FormData ? { "Content-Type": "multipart/form-data" } : {},
  });
  return res.data;
};

export const updateTransaction = async (id, data) => {
  const res = await api.put(`/transactions/${id}`, data, {
    headers: data instanceof FormData ? { "Content-Type": "multipart/form-data" } : {},
  });
  return res.data;
};

export const deleteTransaction = async (id) => {
  const res = await api.delete(`/transactions/${id}`);
  return res.data;
};

export const toggleTransactionReviewed = async (id) => {
  const res = await api.patch(`/transactions/${id}/toggle-reviewed`);
  return res.data;
};

export const uploadTransactions = async (data) => {
  const res = await api.post("/transactions/upload", data);
  return res.data;
};

export const getAccountCurrency = async (id) => {
  const res = await api.get(`/transactions/account-currency/${id}`);
  return res.data;
};

// ========================
// Bank Reconciliation
// ========================

export const getReconciliation = async (accountId = null) => {
  const params = accountId ? `?accountId=${accountId}` : "";
  const res = await api.get(`/reconciliation${params}`);
  return res.data;
};

export const startReconciliation = async (data) => {
  const res = await api.post("/reconciliation/start", data);
  return res.data;
};

export const processReconciliation = async (id) => {
  const res = await api.get(`/reconciliation/${id}`);
  return res.data;
};

export const toggleMatch = async (data) => {
  const res = await api.post("/reconciliation/toggle-match", data);
  return res.data;
};

export const completeReconciliation = async (id) => {
  const res = await api.post(`/reconciliation/${id}/complete`);
  return res.data;
};

export const cancelReconciliation = async (id) => {
  const res = await api.post(`/reconciliation/${id}/cancel`);
  return res.data;
};

export const removeReconciliationItems = async (data) => {
  const res = await api.post("/reconciliation/remove-items", data);
  return res.data;
};

export const updateClosingBalance = async (data) => {
  const res = await api.put("/reconciliation/update-closing-balance", data);
  return res.data;
};

export const viewReconciliation = async (id) => {
  const res = await api.get(`/reconciliation/${id}/view`);
  return res.data;
};

// ========================
// Sales Taxes
// ========================

export const getSalesTaxes = async (filter = "active") => {
  const res = await api.get(`/sales-tax?filter=${filter}`);
  return res.data;
};

export const getSalesTax = async (id) => {
  const res = await api.get(`/sales-tax/${id}`);
  return res.data;
};

export const createSalesTax = async (data) => {
  const res = await api.post("/sales-tax", data);
  return res.data;
};

export const updateSalesTax = async (id, data) => {
  const res = await api.put(`/sales-tax/${id}`, data);
  return res.data;
};

export const deleteSalesTaxApi = async (id) => {
  const res = await api.delete(`/sales-tax/${id}`);
  return res.data;
};

export const toggleSalesTax = async (id) => {
  const res = await api.patch(`/sales-tax/${id}/toggle`);
  return res.data;
};
