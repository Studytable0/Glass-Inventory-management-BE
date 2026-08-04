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

export const createStoreWithAdminTx = async (storeData, adminData) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN'); // Start Transaction
        
        // 1. Insert the Store
        const storeQuery = `
            INSERT INTO stores (store_email, store_name, store_location)
            VALUES ($1, $2, $3)
            RETURNING store_id, store_email, store_name, store_location;
        `;
        const storeValues = [storeData.store_email, storeData.store_name, storeData.store_location];
        const storeResult = await client.query(storeQuery, storeValues);
        const newStore = storeResult.rows[0];

        // 2. Insert the Store Admin using the new store_id
        const adminQuery = `
            INSERT INTO users (store_id, full_name, username, email, password, role)
            VALUES ($1, $2, $3, $4, $5, 'STORE_ADMIN')
            RETURNING id, full_name, username, email, role;
        `;
        const adminValues = [
            newStore.store_id, 
            adminData.full_name, 
            adminData.username, 
            adminData.email, 
            adminData.password
        ];
        const adminResult = await client.query(adminQuery, adminValues);
        const newAdmin = adminResult.rows[0];

        await client.query('COMMIT'); // Save everything
        
        return { store: newStore, admin: newAdmin };
    } catch (error) {
        await client.query('ROLLBACK'); // Undo everything if an error occurs
        throw error; // Pass error to controller
    } finally {
        client.release();
    }
};

export const getAllStoresFromDB = async () => {
    const query = `
        SELECT store_id, store_email, store_name, store_location, status, created_at
        FROM stores
        ORDER BY created_at DESC;
    `;
    const { rows } = await pool.query(query);
    return rows;
};

export const getStoreByIdFromDB = async (store_id) => {
    const query = `
        SELECT store_id, store_email, store_name, store_location, status, created_at
        FROM stores
        WHERE store_id = $1
        LIMIT 1;
    `;
    const { rows } = await pool.query(query, [store_id]);
    return rows[0];
};

export const updateStoreInDB = async (store_id, storeData) => {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (storeData.store_name !== undefined) {
        fields.push(`store_name = $${paramIndex++}`);
        values.push(storeData.store_name);
    }
    if (storeData.store_location !== undefined) {
        fields.push(`store_location = $${paramIndex++}`);
        values.push(storeData.store_location);
    }
    if (storeData.status !== undefined) {
        fields.push(`status = $${paramIndex++}`);
        values.push(storeData.status);
    }
    // Note: store_email usually shouldn't change, or if it does, check for conflicts, but we can allow it if needed. Let's omit it or allow if specified.

    if (fields.length === 0) return null;

    values.push(store_id);
    const query = `
        UPDATE stores
        SET ${fields.join(", ")}
        WHERE store_id = $${paramIndex}
        RETURNING store_id, store_email, store_name, store_location, status, created_at;
    `;

    const { rows } = await pool.query(query, values);
    return rows[0];
};

export const deleteStoreInDB = async (store_id) => {
    // Soft delete recommended due to invoices/inventory constraints
    const query = `
        UPDATE stores
        SET status = false
        WHERE store_id = $1
        RETURNING store_id, store_email, store_name, store_location, status;
    `;
    const { rows } = await pool.query(query, [store_id]);
    return rows[0];
};