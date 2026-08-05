import express from "express";
import { 
    getAvailableProducts,
    getMasterInventory, 
    updateMasterInventory, 
    deleteMasterInventory 
} from "../controllers/inventory.controller.js";
import { authenticate, requireMasterAdmin } from "../middleware/auth.middleware.js";

const router = express.Router();

// ==========================================
// STORE ADMIN ROUTES
// ==========================================
// Fetch available products for the logged-in store admin
router.get("/available", authenticate, getAvailableProducts);

// ==========================================
// MASTER ADMIN ROUTES
// ==========================================
// Master Admin Inventory Management Routes
router.get("/master", authenticate, requireMasterAdmin, getMasterInventory);
router.put("/master/:storeId/:productId", authenticate, requireMasterAdmin, updateMasterInventory);
router.delete("/master/:storeId/:productId", authenticate, requireMasterAdmin, deleteMasterInventory);

export default router;