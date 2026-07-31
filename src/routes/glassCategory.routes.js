import express from "express";
import {
    createGlassCategory,
    getAllGlassCategories,
    getGlassCategoryByID,
    updateGlassCategory,
    deleteGlassCategory
} from "../controllers/glassCategory.controller.js";
import { authenticate, requireMasterAdmin } from "../middleware/auth.middleware.js";

const router = express.Router();

// Master Admin operations
router.post("/", authenticate, requireMasterAdmin, createGlassCategory);
router.put("/:id", authenticate, requireMasterAdmin, updateGlassCategory);
router.delete("/:id", authenticate, requireMasterAdmin, deleteGlassCategory);

// Read operations (accessible to authenticated users)
router.get("/", authenticate, getAllGlassCategories);
router.get("/:id", authenticate, getGlassCategoryByID);

export default router;
