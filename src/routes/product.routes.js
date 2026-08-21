import express from "express";
import {
    createProduct,
    createProductStoreAdmin,
    updateProductStoreAdmin,
    updateProduct,
    deleteProduct,
    getProductByID,
    getAllProducts,
    assignProductToStore,
    removeProductFromStore,
    getAllProductsByStoreId
} from "../controllers/product.controller.js";
import { authenticate, requireMasterAdmin, requireMasterOrStoreAdmin, requireStoreAdmin } from "../middleware/auth.middleware.js";
import { uploadProductImage } from "../middleware/upload.middleware.js";

const router = express.Router();

// Master Admin operations
router.post("/", authenticate, requireMasterAdmin, uploadProductImage, createProduct);

// Store Admin operations
router.post("/store-admin", authenticate, requireStoreAdmin, uploadProductImage, createProductStoreAdmin);
router.put("/store-admin/:id", authenticate, requireStoreAdmin, uploadProductImage, updateProductStoreAdmin);
router.post("/assign-store", authenticate, requireMasterAdmin, assignProductToStore);
router.delete("/remove-store", authenticate, requireMasterAdmin, removeProductFromStore);
router.put("/:id", authenticate, requireMasterAdmin, uploadProductImage, updateProduct);
router.delete("/:id", authenticate, requireMasterAdmin, deleteProduct);

// Read operations (accessible to authenticated users)
router.get("/", authenticate, getAllProducts);
router.get("/store/:store_id", authenticate, getAllProductsByStoreId);
router.get("/:id", authenticate, getProductByID);

export default router;
