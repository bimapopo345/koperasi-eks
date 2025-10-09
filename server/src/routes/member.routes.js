import express from "express";
const router = express.Router();
import { verifyToken } from "../middlewares/auth.middleware.js";
import {
  getAllMembers,
  getMemberByUuid,
  createMember,
  updateMember,
  deleteMember,
  validateMemberUuid,
} from "../controllers/member.controller.js";

// Public routes
router.get("/validate/:uuid", validateMemberUuid);

// Protected routes (need authentication)
router.get("/", verifyToken, getAllMembers);
router.get("/:uuid", verifyToken, getMemberByUuid);
router.post("/", verifyToken, createMember);
router.put("/:uuid", verifyToken, updateMember);
router.delete("/:uuid", verifyToken, deleteMember);

export default router;
