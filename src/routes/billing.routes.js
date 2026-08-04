import express from "express";
import { createBill } from "../controllers/billing.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = express.Router();

// Generate a new bill (Checkout)
router.post("/create", authenticate, createBill);

export default router;