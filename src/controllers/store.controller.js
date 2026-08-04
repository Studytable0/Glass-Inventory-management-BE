import bcrypt from "bcrypt";
import { findStoreByEmail, createStoreWithAdminTx } from "../repositories/store.repository.js";
import { findUserByEmail, findUserByUsername } from "../repositories/auth.repository.js";

export const createStore = async (req, res) => {
    try {
        const userRole = req.user?.role;
        
        if (!userRole || (userRole.toUpperCase() !== "MASTER_ADMIN" && userRole.toUpperCase() !== "MASTERADMIN")) {
            return res.status(403).json({ success: false, message: "Only Master Admin can create stores" });
        }

        const { store_email, store_name, store_location, admin_details } = req.body;

        // 1. Validate Store & Admin inputs
        if (!store_email || !store_name || !store_location || !admin_details) {
            return res.status(400).json({ success: false, message: "Store details and admin_details are required" });
        }

        const { full_name, username, email: adminEmail, password } = admin_details;
        if (!full_name || !username || !adminEmail || !password) {
            return res.status(400).json({ success: false, message: "Incomplete admin_details provided" });
        }

        // 2. Check for duplicates (Store Email, Admin Email, Admin Username)
        if (await findStoreByEmail(store_email)) return res.status(409).json({ success: false, message: "Store email exists" });
        if (await findUserByEmail(adminEmail)) return res.status(409).json({ success: false, message: "Admin email exists" });
        if (await findUserByUsername(username)) return res.status(409).json({ success: false, message: "Admin username taken" });

        // 3. Hash password and execute transaction
        const hashedPassword = await bcrypt.hash(password, 12);
        
        const result = await createStoreWithAdminTx(
            { store_email, store_name, store_location },
            { full_name, username, email: adminEmail, password: hashedPassword }
        );

        return res.status(201).json({
            success: true,
            message: "Store and Admin created successfully",
            data: result
        });

    } catch (error) {
        console.error("Create Store Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};