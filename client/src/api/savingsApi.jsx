import axios from "axios";
import conf from "../conf/conf";

const API_URL = `${conf.server_url}/savings`;

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Savings API services
export const savingsApi = {
  // Get all savings
  getAllSavings: async (params = {}) => {
    const response = await api.get("/", { params });
    return response.data;
  },

  // Get savings by ID
  getSavingsById: async (id) => {
    const response = await api.get(`/${id}`);
    return response.data;
  },

  // Create new savings
  createSavings: async (data) => {
    const formData = new FormData();

    // Append all data to FormData
    Object.keys(data).forEach((key) => {
      if (key === "proofFile" && data[key]) {
        formData.append(key, data[key]);
      } else if (data[key] !== undefined && data[key] !== null) {
        formData.append(key, data[key]);
      }
    });

    const response = await api.post("/", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  // Update savings
  updateSavings: async (id, data) => {
    const formData = new FormData();

    // Append all data to FormData
    Object.keys(data).forEach((key) => {
      if (key === "proofFile" && data[key]) {
        formData.append(key, data[key]);
      } else if (data[key] !== undefined && data[key] !== null) {
        formData.append(key, data[key]);
      }
    });

    const response = await api.put(`/${id}`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  // Delete savings
  deleteSavings: async (id) => {
    const response = await api.delete(`/${id}`);
    return response.data;
  },

  // Get savings by member
  getSavingsByMember: async (memberId, params = {}) => {
    const response = await api.get(`/member/${memberId}`, { params });
    return response.data;
  },

  // Get last installment period for member and product
  getLastInstallmentPeriod: async (memberId, productId) => {
    const response = await api.get(`/check-period/${memberId}/${productId}`);
    return response.data;
  },
};

export default savingsApi;
