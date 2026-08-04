import bcrypt from "bcrypt";
import { 
    findStoreByEmail, 
    createStoreWithAdminTx,
    getAllStoresFromDB,
    getStoreByIdFromDB,
    updateStoreInDB,
    deleteStoreInDB
} from "../repositories/store.repository.js";
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
}

export const getAllStores = async (req, res) => {
    try {
        const stores = await getAllStoresFromDB();
        return res.status(200).json({ success: true, count: stores.length, stores });
    } catch (error) {
        console.error("Get All Stores Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const getStoreById = async (req, res) => {
    try {
        const { id } = req.params;
        const store = await getStoreByIdFromDB(id);
        
        if (!store) {
            return res.status(404).json({ success: false, message: "Store not found" });
        }
        
        return res.status(200).json({ success: true, store });
    } catch (error) {
        console.error("Get Store By ID Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const updateStore = async (req, res) => {
    try {
        const { id } = req.params;
        const { store_name, store_location, status } = req.body;
        
        const existingStore = await getStoreByIdFromDB(id);
        if (!existingStore) {
            return res.status(404).json({ success: false, message: "Store not found" });
        }
        
        const storeData = {};
        if (store_name !== undefined) storeData.store_name = store_name;
        if (store_location !== undefined) storeData.store_location = store_location;
        if (status !== undefined) storeData.status = status;
        
        const updatedStore = await updateStoreInDB(id, storeData);
        
        return res.status(200).json({ success: true, message: "Store updated successfully", store: updatedStore });
    } catch (error) {
        console.error("Update Store Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const deleteStore = async (req, res) => {
    try {
        const { id } = req.params;
        
        const existingStore = await getStoreByIdFromDB(id);
        if (!existingStore) {
            return res.status(404).json({ success: false, message: "Store not found" });
        }
        
        const deletedStore = await deleteStoreInDB(id);
        return res.status(200).json({ success: true, message: "Store deactivated successfully", store: deletedStore });
    } catch (error) {
        console.error("Delete Store Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
