import pool from "../config/db.js";

export const findUserByEmail = async (email) => {
    const query = `
        SELECT *
        FROM users
        WHERE email = $1
            AND status = true
        LIMIT 1;
    `;

    const { rows } = await pool.query(query, [email]);

    return rows[0];
};

export const findUserByUsername = async (username) => {
    const query = `
        SELECT *
        FROM users
        WHERE username = $1
          AND status = true
        LIMIT 1;
    `;

    const { rows } = await pool.query(query, [username]);

    return rows[0];
};

export const findUserById = async (id) => {
    const query = `
        SELECT *
        FROM users
        WHERE id = $1
          AND status = true
        LIMIT 1;
    `;

    const { rows } = await pool.query(query, [id]);

    return rows[0];
};

export const updateUserCredentials = async (id, { email, username, password }) => {
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (email !== undefined) {
        updates.push(`email = $${paramIndex++}`);
        values.push(email);
    }
    if (username !== undefined) {
        updates.push(`username = $${paramIndex++}`);
        values.push(username);
    }
    if (password !== undefined) {
        updates.push(`password = $${paramIndex++}`);
        values.push(password);
    }

    if (updates.length === 0) return null;

    values.push(id);
    const query = `
        UPDATE users
        SET ${updates.join(", ")}
        WHERE id = $${paramIndex}
        RETURNING id, username, email, role, status, store_id;
    `;

    const { rows } = await pool.query(query, values);

    return rows[0];
};

export const createUser = async ({ full_name, username, email, password, role }) => {
    const query = `
        INSERT INTO users (full_name, username, email, password, role)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, full_name, username, email, role, status, created_at;
    `;

    const values = [full_name, username, email, password, role];

    const { rows } = await pool.query(query, values);

    return rows[0];
};

// Insert a new store admin into the users table
export const createStoreAdminRecord = async ({ store_id, full_name, username, email, password }) => {
    const query = `
        INSERT INTO users (store_id, full_name, username, email, password, role)
        VALUES ($1, $2, $3, $4, $5, 'STORE_ADMIN')
        RETURNING id, store_id, full_name, username, email, role, status, created_at;
    `;
    
    const values = [store_id, full_name, username, email, password];
    const { rows } = await pool.query(query, values);
    
    return rows[0];
};

export const updateAdminStoreId = async (userId, newStoreId) => {
    const query = `
        UPDATE users 
        SET store_id = $1 
        WHERE id = $2 AND role = 'STORE_ADMIN' 
        RETURNING id, username, store_id;
    `;
    const { rows } = await pool.query(query, [newStoreId, userId]);
    return rows[0];
};
