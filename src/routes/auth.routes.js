import express from "express";
import { login, updateMasterAdminCredentials } from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = express.Router();

// Login Route
router.post("/login", login);

// Master Admin Update Credentials Route
router.put("/update-credentials", authenticate, updateMasterAdminCredentials);

export default router;