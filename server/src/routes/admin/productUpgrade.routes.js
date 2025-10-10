import express from "express";
import {
  calculateUpgradeCompensation,
  executeProductUpgrade,
  getMemberUpgradeHistory,
  cancelProductUpgrade
} from "../../controllers/admin/productUpgrade.controller.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";

const router = express.Router();

// Product upgrade routes
router.post("/calculate", verifyToken, calculateUpgradeCompensation);
router.post("/execute", verifyToken, executeProductUpgrade);
router.get("/history/:memberId", verifyToken, getMemberUpgradeHistory);
router.patch("/cancel/:upgradeId", verifyToken, cancelProductUpgrade);

export default router;
