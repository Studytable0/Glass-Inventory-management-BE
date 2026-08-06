import express from "express";
import { 
    getAvailableProducts,
    getAllInventory,
    getMasterInventory, 
    updateMasterInventory, 
    deleteMasterInventory,
    updateStockDiscount // ✨ ADDED IMPORT
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
router.get("/all",                              authenticate, requireMasterAdmin, getAllInventory);
router.get("/master",                           authenticate, requireMasterAdmin, getMasterInventory);
router.put("/master/:storeId/:productId",       authenticate, requireMasterAdmin, updateMasterInventory);
router.delete("/master/:storeId/:productId",    authenticate, requireMasterAdmin, deleteMasterInventory);

// ✨ ADDED: Route for Master Admin to set specific stock discount overrides
router.put("/master/update-discount",           authenticate, requireMasterAdmin, updateStockDiscount);

export default router;