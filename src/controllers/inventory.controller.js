import { getAvailableInventoryByStore } from "../repositories/inventory.repository.js";

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