import express from "express";
import { getAvailableProducts } from "../controllers/inventory.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = express.Router();

// Fetch available products for the logged-in store admin
router.get("/available", authenticate, getAvailableProducts);

export default router;