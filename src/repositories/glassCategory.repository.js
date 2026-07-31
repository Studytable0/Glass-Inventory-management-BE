import pool from "../config/db.js";

export const initGlassCategoryTable = async () => {
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS glass_categories (
            id SERIAL PRIMARY KEY,
            category_name VARCHAR(255) NOT NULL UNIQUE,
            description TEXT,
            status BOOLEAN DEFAULT true,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    `;

    try {
        await pool.query(createTableQuery);
        console.log("✅ Glass categories table initialized successfully");
    } catch (error) {
        console.error("❌ Error initializing glass categories table:", error.message);
    }
};

export const createGlassCategoryInDB = async ({ category_name, description }) => {
    const query = `
        INSERT INTO glass_categories (category_name, description)
        VALUES ($1, $2)
        RETURNING *;
    `;
    const values = [category_name.trim(), description ? description.trim() : null];
    const { rows } = await pool.query(query, values);
    return rows[0];
};

export const getAllGlassCategoriesFromDB = async () => {
    const query = `
        SELECT *
        FROM glass_categories
        WHERE status = true
        ORDER BY category_name ASC;
    `;
    const { rows } = await pool.query(query);
    return rows;
};

export const getGlassCategoryByIdFromDB = async (id) => {
    const query = `
        SELECT *
        FROM glass_categories
        WHERE id = $1;
    `;
    const { rows } = await pool.query(query, [id]);
    return rows[0] || null;
};

export const getGlassCategoryByNameFromDB = async (category_name) => {
    if (!category_name || typeof category_name !== 'string') return null;
    const query = `
        SELECT *
        FROM glass_categories
        WHERE LOWER(category_name) = LOWER($1);
    `;
    const { rows } = await pool.query(query, [category_name.trim()]);
    return rows[0] || null;
};

export const updateGlassCategoryInDB = async (id, data) => {
    const fields = ["category_name", "description", "status"];
    const updates = [];
    const values = [];
    let paramIndex = 1;

    fields.forEach((field) => {
        if (data[field] !== undefined) {
            updates.push(`${field} = $${paramIndex++}`);
            values.push(field === "category_name" ? data[field].trim() : data[field]);
        }
    });

    if (updates.length === 0) return null;

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
        UPDATE glass_categories
        SET ${updates.join(", ")}
        WHERE id = $${paramIndex}
        RETURNING *;
    `;

    const { rows } = await pool.query(query, values);
    return rows[0] || null;
};

export const deleteGlassCategoryInDB = async (id) => {
    const query = `
        DELETE FROM glass_categories
        WHERE id = $1
        RETURNING *;
    `;
    const { rows } = await pool.query(query, [id]);
    return rows[0] || null;
};
