import express from "express";
import {
    createProduct,
    updateProduct,
    deleteProduct,
    getProductByID,
    getAllProducts,
    assignProductToStore,
    getAllProductsByStoreId
} from "../controllers/product.controller.js";
import { authenticate, requireMasterAdmin } from "../middleware/auth.middleware.js";

const router = express.Router();

// Master Admin operations
router.post("/", authenticate, requireMasterAdmin, createProduct);
router.post("/assign-store", authenticate, requireMasterAdmin, assignProductToStore);
router.put("/:id", authenticate, requireMasterAdmin, updateProduct);
router.delete("/:id", authenticate, requireMasterAdmin, deleteProduct);

// Read operations (accessible to authenticated users)
router.get("/", authenticate, getAllProducts);
router.get("/store/:store_id", authenticate, getAllProductsByStoreId);
router.get("/:id", authenticate, getProductByID);

export default router;
