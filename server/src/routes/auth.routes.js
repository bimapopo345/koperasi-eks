import express from "express";
import {
  loginUser,
  registerUser,
  getCurrentUser,
  logoutUser,
} from "../controllers/auth.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Public Routes (tidak perlu authentication)
router.post("/login", loginUser);
router.post("/register", registerUser);

// Protected Routes (perlu authentication)
router.get("/me", verifyToken, getCurrentUser);
router.post("/logout", verifyToken, logoutUser);

export default router;
