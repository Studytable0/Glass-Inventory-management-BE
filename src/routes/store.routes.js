import express from "express";
import { 
    createStore,
    getAllStores,
    getStoreById,
    updateStore,
    deleteStore
} from "../controllers/store.controller.js";
import { authenticate, requireMasterAdmin } from "../middleware/auth.middleware.js";

const router = express.Router();

// Apply the authenticate middleware to ensure req.user is populated
router.post("/create", authenticate, requireMasterAdmin, createStore);
router.get("/", authenticate, requireMasterAdmin, getAllStores);
router.get("/:id", authenticate, requireMasterAdmin, getStoreById);
router.put("/:id", authenticate, requireMasterAdmin, updateStore);
router.delete("/:id", authenticate, requireMasterAdmin, deleteStore);

export default router;