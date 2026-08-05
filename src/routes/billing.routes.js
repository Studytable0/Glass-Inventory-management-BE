import express from "express";
import { 
    createBill, 
    getBillingHistory, 
    getGlobalBillingHistory 
} from "../controllers/billing.controller.js";
import { authenticate, requireMasterAdmin } from "../middleware/auth.middleware.js";

const router = express.Router();

// Store Admin routes
router.post("/create", authenticate, createBill);
router.get("/history", authenticate, getBillingHistory);

// Master Admin global routes
router.get("/global-history", authenticate, requireMasterAdmin, getGlobalBillingHistory);

export default router;