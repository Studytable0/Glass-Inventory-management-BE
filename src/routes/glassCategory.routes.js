import express from "express";
import {
    createGlassCategory,
    getAllGlassCategories,
    getGlassCategoryByID,
    updateGlassCategory,
    deleteGlassCategory
} from "../controllers/glassCategory.controller.js";
import { authenticate, requireMasterAdmin, requireMasterOrStoreAdmin } from "../middleware/auth.middleware.js";

const router = express.Router();

// Master Admin operations
router.post("/", authenticate, requireMasterOrStoreAdmin, createGlassCategory);
router.put("/:id", authenticate, requireMasterOrStoreAdmin, updateGlassCategory);
router.delete("/:id", authenticate, requireMasterOrStoreAdmin, deleteGlassCategory);

// Read operations (accessible to authenticated users)
router.get("/", authenticate, getAllGlassCategories);
router.get("/:id", authenticate, getGlassCategoryByID);

export default router;
