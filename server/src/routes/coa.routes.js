import express from "express";
import {
  getAccountsByType,
  getAccountDetail,
  createAccount,
  updateAccount,
  deleteAccount,
  getSubmenusByMasterType,
  getSubmenusLegacy,
  getAllCategories,
  getAssetsAccounts,
} from "../controllers/admin/coa.controller.js";

const router = express.Router();

// GET /api/admin/coa/categories - get all categories (hierarchical)
router.get("/categories", getAllCategories);

// GET /api/admin/coa/assets-accounts - get assets accounts for dropdowns
router.get("/assets-accounts", getAssetsAccounts);

// GET /api/admin/coa/submenus/:masterType - get submenus by master type
router.get("/submenus/:masterType", getSubmenusByMasterType);

// POST /api/admin/coa/getSubmenus - legacy payload compatibility (master_type)
router.post("/getSubmenus", getSubmenusLegacy);

// GET /api/admin/coa/account/:id - get account detail
router.get("/account/:id", getAccountDetail);

// POST /api/admin/coa/account - create account
router.post("/account", createAccount);

// PUT /api/admin/coa/account/:id - update account
router.put("/account/:id", updateAccount);

// DELETE /api/admin/coa/account/:id - soft delete account
router.delete("/account/:id", deleteAccount);

// GET /api/admin/coa/:type - get accounts by master type (default: Assets)
router.get("/:type?", getAccountsByType);

export default router;
