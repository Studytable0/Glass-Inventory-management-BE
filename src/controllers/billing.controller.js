import { createInvoiceTx } from "../repositories/billing.repository.js";

export const createBill = async (req, res) => {
    try {
        const userRole = req.user?.role;
        const storeId = req.user?.storeId;
        const userId = req.user?.id;

        // Block anyone who isn't an assigned Store Admin
        if (!storeId || (userRole.toUpperCase() !== 'STORE_ADMIN' && userRole.toUpperCase() !== 'STOREADMIN')) {
            return res.status(403).json({ success: false, message: "Only Store Admins can generate bills." });
        }

        const { customer_name, customer_phone, items } = req.body;

        // Validation
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, message: "A bill must contain at least one item." });
        }

        for (let item of items) {
            if (!item.product_id || !item.quantity || item.quantity <= 0) {
                 return res.status(400).json({ success: false, message: "Each item must have a valid product_id and a quantity greater than 0." });
            }
        }

        // Execute Transaction
        const result = await createInvoiceTx({
            storeId,
            userId,
            customerName: customer_name,
            customerPhone: customer_phone,
            items
        });

        return res.status(201).json({
            success: true,
            message: "Bill generated successfully!",
            data: result
        });

    } catch (error) {
        console.error("Billing Error:", error);
        
        // Return friendly stock/not found errors directly to frontend
        if (error.message.includes('Insufficient stock') || error.message.includes('not found')) {
            return res.status(400).json({ success: false, message: error.message });
        }
        
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};