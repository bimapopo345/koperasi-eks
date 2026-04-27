import express from "express";
import {
  archiveTos,
  createTos,
  deleteTos,
  getAllTos,
  getTosById,
  unarchiveTos,
  updateTos,
} from "../controllers/admin/tos.controller.js";

const router = express.Router();

router.get("/", getAllTos);
router.get("/:id", getTosById);
router.post("/", createTos);
router.put("/:id", updateTos);
router.post("/:id/archive", archiveTos);
router.post("/:id/unarchive", unarchiveTos);
router.delete("/:id", deleteTos);

export default router;
