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

