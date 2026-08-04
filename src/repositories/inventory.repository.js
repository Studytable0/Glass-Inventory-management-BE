import pool from "../config/db.js";

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