import express from "express";
import { 
  loginUser, 
  registerUser, 
  getCurrentUser, 
  logoutUser 
} from "../controllers/admin/auth.controller.js";
import { getDashboardStats } from "../controllers/admin/dashboard.controller.js";
import { 
  getAllProducts, 
  getProductById, 
  createProduct, 
  updateProduct, 
  deleteProduct, 
  toggleProductStatus 
} from "../controllers/admin/product.controller.js";
import { 
  getAllMembers, 
  getMemberByUuid, 
  createMember, 
  updateMember, 
  deleteMember 
} from "../controllers/admin/member.controller.js";
import { 
  getAllSavings, 
  getSavingsById, 
  createSavings, 
  updateSavings, 
  deleteSavings 
} from "../controllers/admin/savings.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Authentication routes
router.post("/auth/login", loginUser);
router.post("/auth/register", registerUser);
router.post("/auth/logout", verifyToken, logoutUser);
router.get("/auth/me", verifyToken, getCurrentUser);

// Dashboard routes
router.get("/dashboard", verifyToken, getDashboardStats);

// Product management routes
router.get("/products", verifyToken, getAllProducts);
router.get("/products/:id", verifyToken, getProductById);
router.post("/products", verifyToken, createProduct);
router.put("/products/:id", verifyToken, updateProduct);
router.delete("/products/:id", verifyToken, deleteProduct);
router.patch("/products/:id/toggle-status", verifyToken, toggleProductStatus);

// Member management routes
router.get("/members", verifyToken, getAllMembers);
router.get("/members/:uuid", verifyToken, getMemberByUuid);
router.post("/members", verifyToken, createMember);
router.put("/members/:uuid", verifyToken, updateMember);
router.delete("/members/:uuid", verifyToken, deleteMember);

// Savings management routes
router.get("/savings", verifyToken, getAllSavings);
router.get("/savings/:id", verifyToken, getSavingsById);
router.post("/savings", verifyToken, createSavings);
router.put("/savings/:id", verifyToken, updateSavings);
router.delete("/savings/:id", verifyToken, deleteSavings);

export default router;