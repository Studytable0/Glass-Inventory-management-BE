import { 
    getAvailableInventoryByStore,
    getGlobalInventoryFromDB, 
    updateInventoryInDB, 
    deleteInventoryFromDB 
} from "../repositories/inventory.repository.js";

// ==========================================
// STORE ADMIN CONTROLLERS
// ==========================================

export const getAvailableProducts = async (req, res) => {
    try {
        // Grab the storeId from the logged-in user's token (set by the authenticate middleware)
        const storeId = req.user?.storeId;

        // Ensure the user actually belongs to a store
        if (!storeId) {
            return res.status(403).json({
                success: false,
                message: "Access forbidden: No store is assigned to your account."
            });
        }

        // Fetch the products
        const availableProducts = await getAvailableInventoryByStore(storeId);

        // Send success response
        return res.status(200).json({
            success: true,
            count: availableProducts.length,
            data: availableProducts
        });

    } catch (error) {
        console.error("Get Available Products Error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};

// ==========================================
// MASTER ADMIN CONTROLLERS
// ==========================================

// READ ALL
export const getMasterInventory = async (req, res) => {
    try {
        const inventory = await getGlobalInventoryFromDB();
        return res.status(200).json({ success: true, count: inventory.length, data: inventory });
    } catch (error) {
        console.error("Get Master Inventory Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// UPDATE
export const updateMasterInventory = async (req, res) => {
    try {
        // We get the storeId and productId from the URL params
        const { storeId, productId } = req.params;
        const updateData = req.body; 

        const updatedItem = await updateInventoryInDB(storeId, productId, updateData);

        if (!updatedItem) {
            return res.status(404).json({ success: false, message: "Inventory record not found or no data provided" });
        }

        return res.status(200).json({ 
            success: true, 
            message: "Inventory updated successfully", 
            data: updatedItem 
        });
    } catch (error) {
        console.error("Update Inventory Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// DELETE
export const deleteMasterInventory = async (req, res) => {
    try {
        const { storeId, productId } = req.params;

        const deletedItem = await deleteInventoryFromDB(storeId, productId);

        if (!deletedItem) {
            return res.status(404).json({ success: false, message: "Inventory record not found" });
        }

        return res.status(200).json({ 
            success: true, 
            message: "Product removed from store inventory successfully" 
        });
    } catch (error) {
        console.error("Delete Inventory Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};