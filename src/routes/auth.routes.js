import express from "express";
import { login, updateMasterAdminCredentials, register, createStoreAdmin } from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = express.Router();

// Register Route (protected - only authenticated admins can create users)
router.post("/register", authenticate, register);

// Login Route
router.post("/login", login);

// Master Admin Update Credentials Route
router.put("/update-credentials", authenticate, updateMasterAdminCredentials);

// Create Store Admin Route (protected - only Master Admin can create store admins)
router.post("/create-store-admin", authenticate, createStoreAdmin);

export default router;