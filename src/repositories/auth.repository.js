import pool from "../config/db.js";

// Look up user by Email (Include inactive users so duplicate checks work properly)
export const findUserByEmail = async (email) => {
    const query = `
        SELECT *
        FROM users
        WHERE email = $1
        LIMIT 1;
    `;

    const { rows } = await pool.query(query, [email]);
    return rows[0];
};

// Look up user by Username (Include inactive users so duplicate checks work properly)
export const findUserByUsername = async (username) => {
    const query = `
        SELECT *
        FROM users
        WHERE username = $1
        LIMIT 1;
    `;

    const { rows } = await pool.query(query, [username]);
    return rows[0];
};

// Look up user by ID (Allow finding disabled users so Master Admin can manage/re-enable them)
export const findUserById = async (id) => {
    const query = `
        SELECT *
        FROM users
        WHERE id = $1
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
        SET ${updates.join(", ")}, updated_at = CURRENT_TIMESTAMP
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
        SET store_id = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2 AND UPPER(role) = 'STORE_ADMIN' 
        RETURNING id, username, store_id;
    `;
    const { rows } = await pool.query(query, [newStoreId, userId]);
    return rows[0];
};

export const getStoreAdminById = async (id) => {
    const query = `
        SELECT id, store_id, full_name, username, email, role, status, created_at, updated_at
        FROM users
        WHERE id = $1
          AND UPPER(role) = 'STORE_ADMIN'
        LIMIT 1;
    `;
    const { rows } = await pool.query(query, [id]);
    return rows[0] || null;
};

// Fixed: Removed `AND status = true` from WHERE clause so inactive admins can be updated/re-enabled
export const updateStoreAdminById = async (id, updateData) => {
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (updateData.full_name !== undefined) {
        updates.push(`full_name = $${paramIndex++}`);
        values.push(updateData.full_name);
    }
    if (updateData.username !== undefined) {
        updates.push(`username = $${paramIndex++}`);
        values.push(updateData.username);
    }
    if (updateData.email !== undefined) {
        updates.push(`email = $${paramIndex++}`);
        values.push(updateData.email);
    }
    if (updateData.password !== undefined) {
        updates.push(`password = $${paramIndex++}`);
        values.push(updateData.password);
    }
    if (updateData.status !== undefined) {
        updates.push(`status = $${paramIndex++}`);
        values.push(updateData.status);
    }

    if (updates.length === 0) return null;

    values.push(id);
    const query = `
        UPDATE users
        SET ${updates.join(", ")}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramIndex}
          AND UPPER(role) = 'STORE_ADMIN'
        RETURNING id, store_id, full_name, username, email, role, status, created_at, updated_at;
    `;

    const { rows } = await pool.query(query, values);
    return rows[0] || null;
};

// Fixed: Fetch all admins (active + inactive) for the master admin table
export const getAllStoreAdmins = async (limit = 10, offset = 0) => {
    const query = `
        SELECT id, store_id, full_name, username, email, role, status, created_at
        FROM users
        WHERE UPPER(role) = 'STORE_ADMIN'
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2;
    `;

    const countQuery = `
        SELECT COUNT(*) AS total
        FROM users
        WHERE UPPER(role) = 'STORE_ADMIN';
    `;

    const { rows } = await pool.query(query, [limit, offset]);
    const countResult = await pool.query(countQuery);
    const totalCount = parseInt(countResult.rows[0].total, 10);

    return { storeAdmins: rows, totalCount };
};

export const getStoreAdminProfileFromDB = async (userId) => {
    const query = `
        SELECT 
            u.id AS user_id, 
            u.full_name, 
            u.username, 
            u.email, 
            u.role, 
            u.status AS user_status, 
            u.created_at AS user_created_at,
            s.store_id, 
            s.store_name, 
            s.store_email,
            s.store_location, 
            s.status AS store_status
        FROM users u
        LEFT JOIN stores s ON u.store_id = s.store_id
        WHERE u.id = $1 AND UPPER(u.role) = 'STORE_ADMIN' AND u.status = true
        LIMIT 1;
    `;
    const { rows } = await pool.query(query, [userId]);
    return rows[0] || null;
};

export const getMasterAdminProfileFromDB = async (userId) => {
    const query = `
        SELECT 
            id AS user_id, 
            full_name, 
            username, 
            email, 
            role, 
            status AS user_status, 
            created_at AS user_created_at
        FROM users
        WHERE id = $1 AND UPPER(role) IN ('MASTER_ADMIN', 'MASTERADMIN') AND status = true
        LIMIT 1;
    `;
    const { rows } = await pool.query(query, [userId]);
    return rows[0] || null;
};