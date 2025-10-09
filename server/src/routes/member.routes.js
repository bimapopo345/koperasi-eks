import express from "express";
import { 
  loginMember, 
  getCurrentMember, 
  logoutMember 
} from "../controllers/member/auth.controller.js";
import { 
  getMemberSavings, 
  createMemberSaving, 
  getMemberSavingById,
  getMemberSavingsSummary 
} from "../controllers/member/savings.controller.js";
import { verifyMemberToken } from "../middlewares/memberAuth.middleware.js";

const router = express.Router();

// Authentication routes
router.post("/auth/login", loginMember);
router.post("/auth/logout", verifyMemberToken, logoutMember);
router.get("/auth/me", verifyMemberToken, getCurrentMember);

// Savings routes
router.get("/savings", verifyMemberToken, getMemberSavings);
router.post("/savings", verifyMemberToken, createMemberSaving);
router.get("/savings/summary", verifyMemberToken, getMemberSavingsSummary);
router.get("/savings/:id", verifyMemberToken, getMemberSavingById);

export default router;