import pool from "../config/db.js";

// ==========================================
// STORE ADMIN FUNCTIONS
// ==========================================

export const getAvailableInventoryByStore = async (store_id) => {
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
        ORDER BY c.category_name, p.thickness;
    `;
    
    const { rows } = await pool.query(query, [store_id]);
    return rows;
};

// ==========================================
// MASTER ADMIN FUNCTIONS
// ==========================================

// READ: Get all inventory across all stores (with store and product names joined)
export const getGlobalInventoryFromDB = async () => {
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
        ORDER BY s.store_name ASC, p.product_name ASC;
    `;
    const { rows } = await pool.query(query);
    return rows;
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