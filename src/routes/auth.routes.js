import express from "express";
import { login, updateMasterAdminCredentials, register, createStoreAdmin, getAllStoreAdmins, getStoreAdminById, updateStoreAdmin, reassignStoreAdmin } from "../controllers/auth.controller.js";
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

// Master Admin route to list all store admins
router.get("/store-admins", authenticate, getAllStoreAdmins);

// Master Admin route to fetch a single store admin by id
router.get("/store-admins/:id", authenticate, getStoreAdminById);

// Master Admin route to update a store admin by id
router.put("/store-admins/:id", authenticate, updateStoreAdmin);

router.put("/reassign-store", authenticate, reassignStoreAdmin);

export default router;