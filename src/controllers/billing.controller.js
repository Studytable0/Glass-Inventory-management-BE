import { 
    createInvoiceTx, 
    getInvoicesByStore, 
    getAllInvoicesGlobal 
} from "../repositories/billing.repository.js";

export const createBill = async (req, res) => {
    try {
        const userRole = req.user?.role;
        const storeId = req.user?.storeId;
        const userId = req.user?.id;

        // Block non-Store Admin users
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
            
            if (item.width !== undefined && (isNaN(item.width) || item.width <= 0)) {
                return res.status(400).json({ success: false, message: "Item width must be a valid number greater than 0." });
            }
            
            if (item.height !== undefined && (isNaN(item.height) || item.height <= 0)) {
                return res.status(400).json({ success: false, message: "Item height must be a valid number greater than 0." });
            }
            
            if (item.charged_rate !== undefined && (isNaN(item.charged_rate) || item.charged_rate < 0)) {
                return res.status(400).json({ success: false, message: "Item charged_rate must be a valid non-negative number." });
            }
            
            if (item.area !== undefined && (isNaN(item.area) || item.area <= 0)) {
                return res.status(400).json({ success: false, message: "Item area must be a valid positive number." });
            }
            
            if (item.charged_dimension !== undefined && (isNaN(item.charged_dimension) || item.charged_dimension <= 0)) {
                return res.status(400).json({ success: false, message: "Item charged_dimension must be a valid positive number." });
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
        
        if (error.message.includes('Insufficient stock') || error.message.includes('not found') || error.message.includes('Discount limit exceeded')) {
            return res.status(400).json({ success: false, message: error.message });
        }
        
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// For Store Admins to view ONLY their branch's sales history
export const getBillingHistory = async (req, res) => {
    try {
        const userRole = req.user?.role;
        const storeId = req.user?.storeId;

        if (!storeId || (userRole.toUpperCase() !== 'STORE_ADMIN' && userRole.toUpperCase() !== 'STOREADMIN')) {
            return res.status(403).json({ success: false, message: "Only Store Admins can view their billing history." });
        }

        const invoices = await getInvoicesByStore(storeId);

        return res.status(200).json({
            success: true,
            count: invoices.length,
            data: invoices
        });

    } catch (error) {
        console.error("Get Billing History Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// For Master Admins to view ALL sales across the company
export const getGlobalBillingHistory = async (req, res) => {
    try {
        const userRole = req.user?.role;

        if (userRole.toUpperCase() !== 'MASTER_ADMIN' && userRole.toUpperCase() !== 'MASTERADMIN') {
            return res.status(403).json({ 
                success: false, 
                message: "Unauthorized. Only Master Admins can view global sales data." 
            });
        }

        const invoices = await getAllInvoicesGlobal();

        return res.status(200).json({
            success: true,
            count: invoices.length,
            data: invoices
        });

    } catch (error) {
        console.error("Get Global Billing History Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};