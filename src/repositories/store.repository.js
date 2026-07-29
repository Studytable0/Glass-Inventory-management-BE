import pool from "../config/db.js";

// Check if a store email is already registered
export const findStoreByEmail = async (store_email) => {
    const query = `
        SELECT *
        FROM stores
        WHERE store_email = $1
        LIMIT 1;
    `;
    
    const { rows } = await pool.query(query, [store_email]);
    return rows[0];
};

// Insert a new store into the database
export const createStoreRecord = async ({ store_email, store_name, store_location }) => {
    const query = `
        INSERT INTO stores (store_email, store_name, store_location)
        VALUES ($1, $2, $3)
        RETURNING store_id, store_email, store_name, store_location, status, created_at;
    `;
    
    const values = [store_email, store_name, store_location];
    const { rows } = await pool.query(query, values);
    
    return rows[0];
};