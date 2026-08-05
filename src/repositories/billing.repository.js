import pool from "../config/db.js";

export const createInvoiceTx = async ({ storeId, userId, customerName, customerPhone, items }) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN'); // 🔒 Start Transaction

        let grandTotal = 0;
        const processedItems = [];

        // 1. Loop through items to validate stock and calculate totals
        for (const item of items) {
            // UPDATED: Joined with products table to fetch rich details
            const checkStockQuery = `
                SELECT 
                    i.available_stock, i.selling_rate,
                    p.product_name, p.thickness, p.length, p.width, p.color
                FROM inventory i
                JOIN products p ON i.product_id = p.id
                WHERE i.store_id = $1 AND i.product_id = $2
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

            // UPDATED: Added dimensions and details to the output array
            processedItems.push({
                productId: item.product_id,
                productName: stockData.product_name,
                thickness: stockData.thickness,
                length: stockData.length,
                width: stockData.width,
                color: stockData.color,
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

export const getInvoicesByStore = async (storeId) => {
    const query = `
        SELECT 
            i.invoice_id, 
            i.customer_name, 
            i.customer_phone, 
            i.sub_total, 
            i.grand_total, 
            i.created_at,
            JSON_AGG(
                JSON_BUILD_OBJECT(
                    'product_id', ii.product_id,
                    'product_name', p.product_name,
                    'thickness', p.thickness,
                    'length', p.length,
                    'width', p.width,
                    'color', p.color,
                    'quantity', ii.quantity,
                    'unit_price', ii.unit_price,
                    'total_price', ii.total_price
                )
            ) AS items
        FROM invoices i
        JOIN invoice_items ii ON i.invoice_id = ii.invoice_id
        JOIN products p ON ii.product_id = p.id
        WHERE i.store_id = $1
        GROUP BY i.invoice_id
        ORDER BY i.created_at DESC;
    `;
    
    const { rows } = await pool.query(query, [storeId]);
    return rows;
};

export const getAllInvoicesGlobal = async () => {
    const query = `
        SELECT 
            i.invoice_id, 
            i.store_id, 
            i.customer_name, 
            i.customer_phone, 
            i.sub_total, 
            i.grand_total, 
            i.created_at,
            JSON_AGG(
                JSON_BUILD_OBJECT(
                    'product_id', ii.product_id,
                    'product_name', p.product_name,
                    'thickness', p.thickness,
                    'length', p.length,
                    'width', p.width,
                    'color', p.color,
                    'quantity', ii.quantity,
                    'unit_price', ii.unit_price,
                    'total_price', ii.total_price
                )
            ) AS items
        FROM invoices i
        JOIN invoice_items ii ON i.invoice_id = ii.invoice_id
        JOIN products p ON ii.product_id = p.id
        GROUP BY i.invoice_id, i.store_id
        ORDER BY i.created_at DESC;
    `;
    
    const { rows } = await pool.query(query);
    return rows;
};