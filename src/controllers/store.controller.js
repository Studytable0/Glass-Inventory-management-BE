import { findStoreByEmail, createStoreRecord } from "../repositories/store.repository.js";

export const createStore = async (req, res) => {
    try {
        // 1. Verify Master Admin Role (using the payload from req.user set by authenticate middleware)
        const userRole = req.user?.role;

        // console.log("🕵️ DEBUG - Token Data:", req.user);
        
        if (!userRole || (userRole.toUpperCase() !== "MASTER_ADMIN" && userRole.toUpperCase() !== "MASTERADMIN")) {
            return res.status(403).json({
                success: false,
                message: "Access forbidden: Only Master Admin can create stores"
            });
        }

        // 2. Extract and Validate Input Data
        const { store_email, store_name, store_location } = req.body;

        if (!store_email || !store_name || !store_location) {
            return res.status(400).json({
                success: false,
                message: "store_email, store_name, and store_location are required fields"
            });
        }

        // 3. Check for Duplicate Store Email
        const existingStore = await findStoreByEmail(store_email);
        if (existingStore) {
            return res.status(409).json({
                success: false,
                message: "A store with this email already exists"
            });
        }

        // 4. Save Store to Database
        const newStore = await createStoreRecord({
            store_email,
            store_name,
            store_location
        });

        // 5. Send Success Response
        return res.status(201).json({
            success: true,
            message: "Store created successfully",
            store: newStore
        });

    } catch (error) {
        console.error("Create Store Error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};