import express from "express";
import { getMasterDashboard, getStoreDashboard } from "../controllers/dashboard.controller.js";
import { authenticate, requireMasterAdmin } from "../middleware/auth.middleware.js";

const router = express.Router();

// Master Admin Dashboard (All branches)
router.get("/master", authenticate, requireMasterAdmin, getMasterDashboard);

// Store Admin Dashboard (Only their specific branch)
router.get("/store", authenticate, getStoreDashboard);

export default router;