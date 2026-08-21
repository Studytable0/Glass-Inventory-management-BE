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
            const checkStockQuery = `
                SELECT 
                    i.available_stock, i.selling_rate, i.override_max_discount,
                    p.product_name, p.category_id, p.thickness, p.length, p.width, p.color, p.area, p.unit, p.dimension_unit,
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
            
            // Check stock availability
            if (stockData.available_stock < item.quantity) {
                throw new Error(`Insufficient stock for Product ID ${item.product_id}. Only ${stockData.available_stock} left.`);
            }

            // Discount logic check
            const storeLimit = parseFloat(stockData.default_max_discount || 0);
            const overrideLimit = stockData.override_max_discount !== null ? parseFloat(stockData.override_max_discount) : null;
            
            const maxAllowedDiscount = overrideLimit !== null ? overrideLimit : storeLimit;
            const appliedDiscount = parseFloat(item.discount_applied || 0);

            if (appliedDiscount > maxAllowedDiscount) {
                throw new Error(`Discount limit exceeded. Maximum allowed discount for ${stockData.product_name} is ${maxAllowedDiscount}%.`);
            }

            // Calculations
            const unitPricePerSqFt = parseFloat(stockData.selling_rate);
            
            // Extract custom dimensions or fall back to product defaults
            const originalLength = item.height !== undefined 
                ? parseFloat(item.height) 
                : (item.length !== undefined ? parseFloat(item.length) : parseFloat(stockData.length));
            const originalWidth = item.width !== undefined 
                ? parseFloat(item.width) 
                : parseFloat(stockData.width);
                
            const billingLength = getBillingDimension(originalLength);
            const billingWidth = getBillingDimension(originalWidth);
            
            const billingArea = item.area !== undefined 
                ? parseFloat(item.area) 
                : calculateArea(billingLength, billingWidth, stockData.dimension_unit, stockData.unit);
            
            let baseTotalPrice = unitPricePerSqFt * billingArea * item.quantity;
            let discountAmount = baseTotalPrice * (appliedDiscount / 100);
            let finalItemPrice = baseTotalPrice - discountAmount;

            let chargedRateToSave = null;
            if (item.charged_rate !== undefined) {
                finalItemPrice = parseFloat(item.charged_rate);
                baseTotalPrice = finalItemPrice;
                discountAmount = 0;
                chargedRateToSave = finalItemPrice;
            }

            subTotal += baseTotalPrice;
            grandTotal += finalItemPrice;

            processedItems.push({
                productId: item.product_id,
                productName: stockData.product_name,
                category: stockData.category_id !== null ? stockData.category_id : 'N/A',
                thickness: stockData.thickness,
                length: originalLength,
                width: originalWidth,
                billingLength: billingLength,
                billingWidth: billingWidth,
                chargedDimension: item.charged_dimension !== undefined ? String(item.charged_dimension) : null, // ✅ NEW LINE
                color: stockData.color,
                area: billingArea,
                unit: stockData.unit,
                quantity: item.quantity,
                unitPrice: unitPricePerSqFt,
                discountPercent: appliedDiscount,
                chargedRate: chargedRateToSave,
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
            const itemQuery = `
                INSERT INTO invoice_items (
                    invoice_id, product_id, quantity, unit_price, discount_percent, total_price,
                    length, width, charged_dimension, area, charged_rate
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            `;
            await client.query(itemQuery, [
                invoice.invoice_id, 
                pItem.productId, 
                pItem.quantity, 
                pItem.unitPrice, 
                pItem.discountPercent, 
                pItem.totalPrice,
                pItem.length,
                pItem.width,
                pItem.chargedDimension,
                pItem.area,
                pItem.chargedRate
            ]);

            const updateStockQuery = `
                UPDATE inventory
                SET available_stock = available_stock - $1, updated_at = CURRENT_TIMESTAMP
                WHERE store_id = $2 AND product_id = $3
            `;
            await client.query(updateStockQuery, [pItem.quantity, storeId, pItem.productId]);
        }

        await client.query('COMMIT'); // ✅ Save transaction
        
        const formattedInvoice = {
            invoice_id: invoice.invoice_id,
            customer_name: invoice.customer_name,
            total_price: invoice.grand_total,
            created_at: invoice.created_at
        };

        const formattedItems = processedItems.map(item => ({
            productId: item.productId,
            productName: item.productName,
            category: item.category,
            thickness: item.thickness,
            length: item.length,
            width: item.width,
            charged_dimension: item.chargedDimension,
            color: item.color,
            area: item.area,
            unit: item.unit,
            quantity: item.quantity,
            charged_rate: item.totalPrice
        }));

        return { invoice: formattedInvoice, items: formattedItems };

    } catch (error) {
        await client.query('ROLLBACK'); // ❌ Rollback transaction on failure
        throw error;
    } finally {
        client.release();
    }
};

export const getInvoicesByStore = async (storeId, page = 1, limit = 10) => {
    const offset = (page - 1) * limit;

    const countQuery = `SELECT COUNT(*) FROM invoices WHERE store_id = $1`;
    const countResult = await pool.query(countQuery, [storeId]);
    const totalRecords = parseInt(countResult.rows[0].count, 10);

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
                    'category', COALESCE(p.category_id::text, 'N/A'),
                    'thickness', p.thickness,
                    'length', COALESCE(ii.length, p.length),
                    'width', COALESCE(ii.width, p.width),
                    'charged_dimension', ii.charged_dimension,
                    'color', p.color,
                    'area', COALESCE(ii.area, p.area),
                    'unit', p.unit,
                    'quantity', ii.quantity,
                    'unit_price', ii.unit_price,
                    'discount_percent', ii.discount_percent,
                    'charged_rate', ii.charged_rate,
                    'total_price', ii.total_price
                )
            ) AS items
        FROM invoices i
        JOIN invoice_items ii ON i.invoice_id = ii.invoice_id
        JOIN products p ON ii.product_id = p.id
        WHERE i.store_id = $1
        GROUP BY i.invoice_id
        ORDER BY i.created_at DESC
        LIMIT $2 OFFSET $3;
    `;
    
    const { rows } = await pool.query(query, [storeId, limit, offset]);
    return {
        data: rows,
        totalRecords,
        currentPage: parseInt(page, 10),
        totalPages: Math.ceil(totalRecords / limit)
    };
};

export const getAllInvoicesGlobal = async (page = 1, limit = 10) => {
    const offset = (page - 1) * limit;

    const countQuery = `SELECT COUNT(*) FROM invoices`;
    const countResult = await pool.query(countQuery);
    const totalRecords = parseInt(countResult.rows[0].count, 10);

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
                    'category', COALESCE(p.category_id::text, 'N/A'),
                    'thickness', p.thickness,
                    'length', COALESCE(ii.length, p.length),
                    'width', COALESCE(ii.width, p.width),
                    'charged_dimension', ii.charged_dimension,
                    'color', p.color,
                    'area', COALESCE(ii.area, p.area),
                    'unit', p.unit,
                    'quantity', ii.quantity,
                    'unit_price', ii.unit_price,
                    'discount_percent', ii.discount_percent,
                    'charged_rate', ii.charged_rate,
                    'total_price', ii.total_price
                )
            ) AS items
        FROM invoices i
        JOIN invoice_items ii ON i.invoice_id = ii.invoice_id
        JOIN products p ON ii.product_id = p.id
        GROUP BY i.invoice_id, i.store_id
        ORDER BY i.created_at DESC
        LIMIT $1 OFFSET $2;
    `;
    
    const { rows } = await pool.query(query, [limit, offset]);
    return {
        data: rows,
        totalRecords,
        currentPage: parseInt(page, 10),
        totalPages: Math.ceil(totalRecords / limit)
    };
}; 
