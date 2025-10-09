import conf from "../conf/conf.js";
import axios from "axios";

// Set up base URL for the API
const BASE_URL = conf.server_url;

// Create axios instance with default config
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token
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

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// Auth API functions
export const signUp = async (data) => {
  try {
    const response = await api.post("/api/auth/register", data);
    return response.data;
  } catch (error) {
    console.error("Sign up error:", error);
    throw (
      error.response?.data || { success: false, message: "Terjadi kesalahan" }
    );
  }
};

export const logIn = async (data) => {
  try {
    const response = await api.post("/api/auth/login", data);

    // Store token and user data
    if (response.data.success && response.data.data.token) {
      localStorage.setItem("token", response.data.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.data.user));
    }

    return response.data;
  } catch (error) {
    console.error("Login error:", error);
    throw (
      error.response?.data || { success: false, message: "Terjadi kesalahan" }
    );
  }
};

export const getCurrentUser = async () => {
  try {
    const response = await api.get("/api/auth/me");
    return response.data;
  } catch (error) {
    console.error("Get current user error:", error);
    throw (
      error.response?.data || { success: false, message: "Terjadi kesalahan" }
    );
  }
};

export const logoutUser = async () => {
  try {
    const response = await api.post("/api/auth/logout");
    // Clear stored data
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    return response.data;
  } catch (error) {
    console.error("Logout error:", error);
    // Clear data even if API call fails
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    throw (
      error.response?.data || { success: false, message: "Terjadi kesalahan" }
    );
  }
};

// Helper function to check if user is authenticated
export const isAuthenticated = () => {
  return !!localStorage.getItem("token");
};

// Helper function to get stored user data
export const getStoredUser = () => {
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user) : null;
};

// Helper function to get auth token
export const getAuthToken = () => {
  return localStorage.getItem("token");
};

export default api;
