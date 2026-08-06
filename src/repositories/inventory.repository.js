import pool from "../config/db.js";

// ==========================================
// STORE ADMIN FUNCTIONS
// ==========================================

export const getAvailableInventoryByStore = async (store_id, limit = 10, offset = 0) => {
    const query = `
        SELECT 
            p.id AS product_id,
            p.product_name,
            c.category_name,
            p.color,
            p.thickness,
            p.length,
            p.width,
            p.dimension_unit,
            p.area,
            p.unit,
            i.selling_rate,
            i.available_stock
        FROM inventory i
        JOIN products p ON i.product_id = p.id
        JOIN glass_categories c ON p.category_id = c.id
        WHERE i.store_id = $1 AND i.available_stock > 0
        ORDER BY c.category_name, p.thickness
        LIMIT $2 OFFSET $3;
    `;
    
    const countQuery = `
        SELECT COUNT(*) AS total
        FROM inventory i
        WHERE i.store_id = $1 AND i.available_stock > 0;
    `;
    
    const { rows } = await pool.query(query, [store_id, limit, offset]);
    const countResult = await pool.query(countQuery, [store_id]);
    const totalCount = parseInt(countResult.rows[0].total, 10);

    return { inventory: rows, totalCount };
};

// ==========================================
// MASTER ADMIN FUNCTIONS
// ==========================================

// READ: Get ALL inventory with full product, store, category details + summary stats
// READ: Get ALL inventory with full product, store, category details + summary stats
export const getAllInventoryFromDB = async (limit = 10, offset = 0) => {
    // Query 1: Full inventory list with all joined details
    const inventoryQuery = `
        SELECT 
            i.id                        AS inventory_id,
            i.store_id,
            s.store_name,
            s.store_location,
            i.product_id,
            p.product_name,
            p.product_image,
            c.id                        AS category_id,
            c.category_name,
            p.color,
            p.thickness,
            p.length,
            p.width,
            p.dimension_unit,
            p.area,
            p.unit,
            i.purchase_rate,
            i.selling_rate,
            i.available_stock,
            i.minimum_stock,
            CASE 
                WHEN i.available_stock <= 0                      THEN 'out_of_stock'
                WHEN i.available_stock <= i.minimum_stock        THEN 'low_stock'
                ELSE                                                  'in_stock'
            END                         AS stock_status,
            (i.available_stock * i.selling_rate)   AS stock_value,
            i.updated_at
        FROM inventory i
        JOIN products p  ON i.product_id = p.id
        JOIN stores s    ON i.store_id   = s.store_id
        JOIN glass_categories c ON p.category_id = c.id
        ORDER BY s.store_name ASC, c.category_name ASC, p.product_name ASC
        LIMIT $1 OFFSET $2;
    `;

    // Query 2: Aggregate summary stats across the entire company
    const summaryQuery = `
        SELECT
            COUNT(*)                                            AS total_inventory_records,
            COUNT(DISTINCT i.product_id)                       AS total_unique_products,
            COUNT(DISTINCT i.store_id)                         AS total_stores_with_stock,
            COALESCE(SUM(i.available_stock), 0)                AS total_stock_units,
            COALESCE(SUM(i.available_stock * i.selling_rate), 0)  AS total_stock_value,
            COALESCE(SUM(i.available_stock * i.purchase_rate), 0) AS total_purchase_value,
            COUNT(*) FILTER (WHERE i.available_stock <= 0)                   AS out_of_stock_count,
            COUNT(*) FILTER (WHERE i.available_stock > 0 
                               AND i.available_stock <= i.minimum_stock)     AS low_stock_count,
            COUNT(*) FILTER (WHERE i.available_stock > i.minimum_stock)      AS in_stock_count
        FROM inventory i
        JOIN stores s ON i.store_id = s.store_id;
    `;

    const [inventoryResult, summaryResult] = await Promise.all([
        pool.query(inventoryQuery, [limit, offset]),
        pool.query(summaryQuery),
    ]);

    return {
        inventory: inventoryResult.rows,
        summary: summaryResult.rows[0],
    };
};

// READ: Get all inventory across all stores (with store and product names joined)
export const getGlobalInventoryFromDB = async (limit = 10, offset = 0) => {
    const query = `
        SELECT 
            i.store_id, s.store_name, 
            i.product_id, p.product_name, p.color, p.thickness,
            p.length, p.width, p.dimension_unit, p.area, p.unit,  -- ✨ ADDED DIMENSIONS
            i.available_stock, i.minimum_stock, 
            i.purchase_rate, i.selling_rate, i.updated_at
        FROM inventory i
        JOIN products p ON i.product_id = p.id
        JOIN stores s ON i.store_id = s.store_id
        ORDER BY s.store_name ASC, p.product_name ASC
        LIMIT $1 OFFSET $2;
    `;
    const countQuery = `SELECT COUNT(*) AS total FROM inventory;`;
    
    const [inventoryResult, countResult] = await Promise.all([
        pool.query(query, [limit, offset]),
        pool.query(countQuery)
    ]);
    
    return {
        inventory: inventoryResult.rows,
        totalCount: parseInt(countResult.rows[0].total, 10)
    };
};

// UPDATE: Modify stock, prices, or minimum stock for a specific store's product
export const updateInventoryInDB = async (storeId, productId, updateData) => {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (updateData.available_stock !== undefined) {
        fields.push(`available_stock = $${paramIndex++}`);
        values.push(updateData.available_stock);
    }
    if (updateData.minimum_stock !== undefined) {
        fields.push(`minimum_stock = $${paramIndex++}`);
        values.push(updateData.minimum_stock);
    }
    if (updateData.purchase_rate !== undefined) {
        fields.push(`purchase_rate = $${paramIndex++}`);
        values.push(updateData.purchase_rate);
    }
    if (updateData.selling_rate !== undefined) {
        fields.push(`selling_rate = $${paramIndex++}`);
        values.push(updateData.selling_rate);
    }

    if (fields.length === 0) return null;

    // Add updated_at timestamp
    fields.push(`updated_at = CURRENT_TIMESTAMP`);

    values.push(storeId, productId);
    const query = `
        UPDATE inventory
        SET ${fields.join(", ")}
        WHERE store_id = $${paramIndex} AND product_id = $${paramIndex + 1}
        RETURNING *;
    `;

    const { rows } = await pool.query(query, values);
    return rows[0];
};

// DELETE: Remove a product completely from a store's inventory
export const deleteInventoryFromDB = async (storeId, productId) => {
    const query = `
        DELETE FROM inventory
        WHERE store_id = $1 AND product_id = $2
        RETURNING *;
    `;
    const { rows } = await pool.query(query, [storeId, productId]);
    return rows[0];
};