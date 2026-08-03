import pool from "../config/db.js";

export const createInvoiceTx = async ({ storeId, userId, customerName, customerPhone, items }) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN'); // 🔒 Start Transaction

        let grandTotal = 0;
        const processedItems = [];

        // 1. Loop through items to validate stock and calculate totals
        for (const item of items) {
            const checkStockQuery = `
                SELECT available_stock, selling_rate
                FROM inventory
                WHERE store_id = $1 AND product_id = $2
            `;
            const { rows } = await client.query(checkStockQuery, [storeId, item.product_id]);
            
            if (rows.length === 0) {
                throw new Error(`Product ID ${item.product_id} not found in this store's inventory.`);
            }

            const stockData = rows[0];
            
            // Check if there is enough stock
            if (stockData.available_stock < item.quantity) {
                throw new Error(`Insufficient stock for Product ID ${item.product_id}. Only ${stockData.available_stock} left.`);
            }

            // Math calculations
            const unitPrice = parseFloat(stockData.selling_rate);
            const itemTotalPrice = unitPrice * item.quantity;

            grandTotal += itemTotalPrice;

            processedItems.push({
                productId: item.product_id,
                quantity: item.quantity,
                unitPrice: unitPrice,
                totalPrice: itemTotalPrice
            });
        }

        // 2. Insert into invoices table (no GST columns)
        const invoiceQuery = `
            INSERT INTO invoices (store_id, billed_by, customer_name, customer_phone, sub_total, grand_total)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING invoice_id, customer_name, grand_total, created_at;
        `;
        
        // Since there's no GST, sub_total and grand_total are exactly the same
        const invoiceValues = [storeId, userId, customerName, customerPhone, grandTotal, grandTotal];
        const invoiceResult = await client.query(invoiceQuery, invoiceValues);
        const invoice = invoiceResult.rows[0];

        // 3. Insert invoice items and deduct inventory
        for (const pItem of processedItems) {
            const itemQuery = `
                INSERT INTO invoice_items (invoice_id, product_id, quantity, unit_price, total_price)
                VALUES ($1, $2, $3, $4, $5)
            `;
            await client.query(itemQuery, [
                invoice.invoice_id, pItem.productId, pItem.quantity, pItem.unitPrice, pItem.totalPrice
            ]);

            const updateStockQuery = `
                UPDATE inventory
                SET available_stock = available_stock - $1, updated_at = CURRENT_TIMESTAMP
                WHERE store_id = $2 AND product_id = $3
            `;
            await client.query(updateStockQuery, [pItem.quantity, storeId, pItem.productId]);
        }

        await client.query('COMMIT'); // ✅ Save all changes
        return { invoice, items: processedItems };

    } catch (error) {
        await client.query('ROLLBACK'); // ❌ Undo everything if an error occurs
        throw error;
    } finally {
        client.release();
    }
};