import axios from "axios";
import { API_URL } from "./config";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
};

const getMultipartHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "multipart/form-data",
  };
};

// Loan API
export const loanApi = {
  // Create loan application
  apply: async (data) => {
    const response = await axios.post(
      `${API_URL}/api/admin/loans/apply`,
      data,
      { headers: getAuthHeaders() }
    );
    return response.data;
  },

  // Calculate loan installment
  calculate: async (data) => {
    const response = await axios.post(
      `${API_URL}/api/admin/loans/calculate`,
      data,
      { headers: getAuthHeaders() }
    );
    return response.data;
  },

  // Get all loans
  getAll: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await axios.get(
      `${API_URL}/api/admin/loans${queryString ? `?${queryString}` : ""}`,
      { headers: getAuthHeaders() }
    );
    return response.data;
  },

  // Get loans by member
  getByMember: async (memberId) => {
    const response = await axios.get(
      `${API_URL}/api/admin/loans/member/${memberId}`,
      { headers: getAuthHeaders() }
    );
    return response.data;
  },

  // Get loan detail
  getDetail: async (loanId) => {
    const response = await axios.get(
      `${API_URL}/api/admin/loans/${loanId}`,
      { headers: getAuthHeaders() }
    );
    return response.data;
  },

  // Approve loan
  approve: async (loanId) => {
    const response = await axios.post(
      `${API_URL}/api/admin/loans/${loanId}/approve`,
      {},
      { headers: getAuthHeaders() }
    );
    return response.data;
  },

  // Reject loan
  reject: async (loanId, rejectionReason) => {
    const response = await axios.post(
      `${API_URL}/api/admin/loans/${loanId}/reject`,
      { rejectionReason },
      { headers: getAuthHeaders() }
    );
    return response.data;
  },

  // Update loan status
  updateStatus: async (loanId, status) => {
    const response = await axios.patch(
      `${API_URL}/api/admin/loans/${loanId}/status`,
      { status },
      { headers: getAuthHeaders() }
    );
    return response.data;
  },

  // Check overdue loans
  checkOverdue: async () => {
    const response = await axios.post(
      `${API_URL}/api/admin/loans/check-overdue`,
      {},
      { headers: getAuthHeaders() }
    );
    return response.data;
  },
};

// Loan Payment API
export const loanPaymentApi = {
  // Create payment
  create: async (formData) => {
    const response = await axios.post(
      `${API_URL}/api/admin/loan-payments`,
      formData,
      { headers: getMultipartHeaders() }
    );
    return response.data;
  },

  // Get all payments
  getAll: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await axios.get(
      `${API_URL}/api/admin/loan-payments${queryString ? `?${queryString}` : ""}`,
      { headers: getAuthHeaders() }
    );
    return response.data;
  },

  // Get payments by loan
  getByLoan: async (loanId) => {
    const response = await axios.get(
      `${API_URL}/api/admin/loan-payments/loan/${loanId}`,
      { headers: getAuthHeaders() }
    );
    return response.data;
  },

  // Get overdue payments
  getOverdue: async () => {
    const response = await axios.get(
      `${API_URL}/api/admin/loan-payments/overdue`,
      { headers: getAuthHeaders() }
    );
    return response.data;
  },

  // Approve payment
  approve: async (paymentId) => {
    const response = await axios.post(
      `${API_URL}/api/admin/loan-payments/${paymentId}/approve`,
      {},
      { headers: getAuthHeaders() }
    );
    return response.data;
  },

  // Reject payment
  reject: async (paymentId, rejectionReason) => {
    const response = await axios.post(
      `${API_URL}/api/admin/loan-payments/${paymentId}/reject`,
      { rejectionReason },
      { headers: getAuthHeaders() }
    );
    return response.data;
  },

  // Bulk approve payments
  bulkApprove: async (paymentIds) => {
    const response = await axios.post(
      `${API_URL}/api/admin/loan-payments/bulk-approve`,
      { paymentIds },
      { headers: getAuthHeaders() }
    );
    return response.data;
  },
};

export default { loanApi, loanPaymentApi };
