import pool from "../config/db.js";

const calculateArea = (length, width, dimensionUnit = "mm", unit = "Sq.ft") => {
    const l = parseFloat(length);
    const w = parseFloat(width);

    if (isNaN(l) || isNaN(w)) return 0;

    const dUnit = String(dimensionUnit).toLowerCase();
    const outUnit = String(unit).toLowerCase();

    let lengthInFeet = 0;
    let widthInFeet = 0;

    if (dUnit.includes("feet") || dUnit === "ft") {
        lengthInFeet = l;
        widthInFeet = w;
    } 
    else if (dUnit.includes("inch") || dUnit === "in") {
        lengthInFeet = l / 12.0;
        widthInFeet = w / 12.0;
    } 
    else {
        lengthInFeet = l / 304.8;
        widthInFeet = w / 304.8;
    }

    const areaSqFt = lengthInFeet * widthInFeet;
    const isSqM = outUnit === "sq.m" || outUnit === "sqm" || outUnit.includes("meter");
    
    if (isSqM) {
        return parseFloat((areaSqFt * 0.092903).toFixed(4));
    } 

    return parseFloat(areaSqFt.toFixed(4));
};

const getBillingDimension = (val) => {
    if (val <= 12) return 12;
    if (val <= 18) return 18;
    if (val <= 24) return 24;
    if (val <= 36) return 36;
    return val;
};

export const createInvoiceTx = async ({ storeId, userId, customerName, customerPhone, items }) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN'); // 🔒 Start Transaction

        let subTotal = 0;   // Total BEFORE discount
        let grandTotal = 0; // Total AFTER discount
        const processedItems = [];

        // 1. Loop through items to validate stock, apply discounts, and calculate totals
        for (const item of items) {
            // ✅ UPDATED: Joined stores table to get default_max_discount & fetched override_max_discount
            const checkStockQuery = `
                SELECT 
                    i.available_stock, i.selling_rate, i.override_max_discount,
                    p.product_name, p.thickness, p.length, p.width, p.color, p.area, p.unit, p.dimension_unit,
                    s.default_max_discount
                FROM inventory i
                JOIN products p ON i.product_id = p.id
                JOIN stores s ON i.store_id = s.store_id
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

            // ✅ DISCOUNT LOGIC: Determine Max Allowed Discount
            const storeLimit = parseFloat(stockData.default_max_discount || 0);
            const overrideLimit = stockData.override_max_discount !== null ? parseFloat(stockData.override_max_discount) : null;
            
            // Override takes precedence if it exists; otherwise use store default
            const maxAllowedDiscount = overrideLimit !== null ? overrideLimit : storeLimit;
            const appliedDiscount = parseFloat(item.discount_applied || 0);

            // ✅ SECURITY CHECK: Block unauthorized discounts
            if (appliedDiscount > maxAllowedDiscount) {
                throw new Error(`Discount limit exceeded. Maximum allowed discount for ${stockData.product_name} is ${maxAllowedDiscount}%.`);
            }

            // ✅ MATH CALCULATION: Area * Rate * Qty
            const unitPricePerSqFt = parseFloat(stockData.selling_rate);
            
            const originalLength = parseFloat(stockData.length);
            const originalWidth = parseFloat(stockData.width);
            const billingLength = getBillingDimension(originalLength);
            const billingWidth = getBillingDimension(originalWidth);
            
            const billingArea = calculateArea(billingLength, billingWidth, stockData.dimension_unit, stockData.unit);
            
            const baseTotalPrice = unitPricePerSqFt * billingArea * item.quantity;
            const discountAmount = baseTotalPrice * (appliedDiscount / 100);
            const finalItemPrice = baseTotalPrice - discountAmount;

            subTotal += baseTotalPrice;
            grandTotal += finalItemPrice;

            // Added discount_percent to the processed items
            processedItems.push({
                productId: item.product_id,
                productName: stockData.product_name,
                thickness: stockData.thickness,
                length: stockData.length,
                width: stockData.width,
                color: stockData.color,
                area: billingArea,
                unit: stockData.unit,
                quantity: item.quantity,
                unitPrice: unitPricePerSqFt,
                discountPercent: appliedDiscount,
                totalPrice: finalItemPrice
            });
        }

        // 2. Insert into invoices table
        const invoiceQuery = `
            INSERT INTO invoices (store_id, billed_by, customer_name, customer_phone, sub_total, grand_total)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING invoice_id, customer_name, sub_total, grand_total, created_at;
        `;
        
        const invoiceValues = [storeId, userId, customerName, customerPhone, subTotal, grandTotal];
        const invoiceResult = await client.query(invoiceQuery, invoiceValues);
        const invoice = invoiceResult.rows[0];

        // 3. Insert invoice items and deduct inventory
        for (const pItem of processedItems) {
            // ✅ UPDATED: Added discount_percent to the insert query
            const itemQuery = `
                INSERT INTO invoice_items (invoice_id, product_id, quantity, unit_price, discount_percent, total_price)
                VALUES ($1, $2, $3, $4, $5, $6)
            `;
            await client.query(itemQuery, [
                invoice.invoice_id, pItem.productId, pItem.quantity, pItem.unitPrice, pItem.discountPercent, pItem.totalPrice
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
                    'area', p.area,
                    'unit', p.unit,
                    'quantity', ii.quantity,
                    'unit_price', ii.unit_price,
                    'discount_percent', ii.discount_percent,
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
                    'area', p.area,
                    'unit', p.unit,
                    'quantity', ii.quantity,
                    'unit_price', ii.unit_price,
                    'discount_percent', ii.discount_percent,
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