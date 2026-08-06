import { 
    getAvailableInventoryByStore,
    getAllInventoryFromDB,
    getGlobalInventoryFromDB, 
    updateInventoryInDB, 
    deleteInventoryFromDB,
    updateStockDiscountOverrideInDB
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

        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const offset = (page - 1) * limit;

        // Fetch the products
        const { inventory: availableProducts, totalCount } = await getAvailableInventoryByStore(storeId, limit, offset);
        const totalPages = Math.ceil(totalCount / limit);

        // Format numeric fields to floats
        const formattedProducts = availableProducts.map(item => ({
            ...item,
            selling_rate: item.selling_rate ? parseFloat(item.selling_rate) : 0,
            area: item.area ? parseFloat(item.area) : 0,
            length: item.length ? parseFloat(item.length) : 0,
            width: item.width ? parseFloat(item.width) : 0
        }));

        // Send success response
        return res.status(200).json({
            success: true,
            count: formattedProducts.length,
            totalCount,
            totalPages,
            currentPage: page,
            data: formattedProducts
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

// GET ALL INVENTORY — Full list + summary stats (Master Admin only)
export const getAllInventory = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const offset = (page - 1) * limit;

        const { inventory, summary } = await getAllInventoryFromDB(limit, offset);
        const totalCount = parseInt(summary.total_inventory_records, 10);
        const totalPages = Math.ceil(totalCount / limit);

        // Format numeric fields
        const formattedInventory = inventory.map(item => ({
            ...item,
            purchase_rate: item.purchase_rate ? parseFloat(item.purchase_rate) : 0,
            selling_rate: item.selling_rate ? parseFloat(item.selling_rate) : 0,
            stock_value: item.stock_value ? parseFloat(item.stock_value) : 0,
            area: item.area ? parseFloat(item.area) : 0,
            length: item.length ? parseFloat(item.length) : 0,
            width: item.width ? parseFloat(item.width) : 0
        }));

        return res.status(200).json({
            success: true,
            summary: {
                total_inventory_records:  parseInt(summary.total_inventory_records),
                total_unique_products:    parseInt(summary.total_unique_products),
                total_stores_with_stock:  parseInt(summary.total_stores_with_stock),
                total_stock_units:        parseInt(summary.total_stock_units),
                total_stock_value:        parseFloat(summary.total_stock_value).toFixed(2),
                total_purchase_value:     parseFloat(summary.total_purchase_value).toFixed(2),
                in_stock_count:           parseInt(summary.in_stock_count),
                low_stock_count:          parseInt(summary.low_stock_count),
                out_of_stock_count:       parseInt(summary.out_of_stock_count),
            },
            count: formattedInventory.length,
            totalCount,
            totalPages,
            currentPage: page,
            data: formattedInventory,
        });
    } catch (error) {
        console.error("Get All Inventory Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// READ ALL
export const getMasterInventory = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const offset = (page - 1) * limit;

        const { inventory, totalCount } = await getGlobalInventoryFromDB(limit, offset);
        const totalPages = Math.ceil(totalCount / limit);
        
        const formattedInventory = inventory.map(item => ({
            ...item,
            purchase_rate: item.purchase_rate ? parseFloat(item.purchase_rate) : 0,
            selling_rate: item.selling_rate ? parseFloat(item.selling_rate) : 0
        }));

        return res.status(200).json({ 
            success: true, 
            count: formattedInventory.length, 
            totalCount,
            totalPages,
            currentPage: page,
            data: formattedInventory 
        });
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

// inventory.controller.js
export const updateStockDiscount = async (req, res) => {
    try {
        const { store_id, product_id, override_max_discount } = req.body;
        const stock = await updateStockDiscountOverrideInDB(store_id, product_id, override_max_discount);
        res.status(200).json({ success: true, message: "Stock discount override updated!", data: stock });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};