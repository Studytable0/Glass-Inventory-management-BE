import express from "express";
import { login, updateMasterAdminCredentials, register } from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = express.Router();

// Register Route (protected - only authenticated admins can create users)
router.post("/register", authenticate, register);

// Login Route
router.post("/login", login);

// Master Admin Update Credentials Route
router.put("/update-credentials", authenticate, updateMasterAdminCredentials);

export default router;