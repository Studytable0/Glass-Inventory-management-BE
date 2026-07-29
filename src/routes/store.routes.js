import express from "express";
import { createStore } from "../controllers/store.controller.js";
import { authenticate } from "../middleware/auth.middleware.js"; // Your existing middleware

const router = express.Router();

// Apply the authenticate middleware to ensure req.user is populated
router.post("/create", authenticate, createStore);

export default router;