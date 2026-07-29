import pool from "../config/db.js";

export const initProductTables = async () => {
    const createProductsTableQuery = `
        CREATE TABLE IF NOT EXISTS products (
            id SERIAL PRIMARY KEY,
            product_name VARCHAR(255) NOT NULL,
            glass_category VARCHAR(100) NOT NULL,
            color VARCHAR(50) NOT NULL,
            thickness VARCHAR(50) NOT NULL,
            length NUMERIC(10, 2) NOT NULL,
            width NUMERIC(10, 2) NOT NULL,
            dimension_unit VARCHAR(20) DEFAULT 'mm',
            area NUMERIC(10, 4) NOT NULL,
            unit VARCHAR(20) DEFAULT 'Sq.ft',
            purchase_rate NUMERIC(12, 2) NOT NULL,
            selling_rate NUMERIC(12, 2) NOT NULL,
            gst NUMERIC(5, 2) DEFAULT 0.00,
            available_stock INT DEFAULT 0,
            minimum_stock INT DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    `;

    const createStoreProductsTableQuery = `
        CREATE TABLE IF NOT EXISTS store_products (
            id SERIAL PRIMARY KEY,
            store_id INT NOT NULL,
            product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
            quantity INT DEFAULT 0,
            assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(store_id, product_id)
        );
    `;

    try {
        await pool.query(createProductsTableQuery);
        await pool.query(createStoreProductsTableQuery);
        console.log("✅ Product tables initialized successfully");
    } catch (error) {
        console.error("❌ Error initializing product tables:", error.message);
    }
};

export const createProductInDB = async (data) => {
    const query = `
        INSERT INTO products (
            product_name,
            glass_category,
            color,
            thickness,
            length,
            width,
            dimension_unit,
            area,
            unit,
            purchase_rate,
            selling_rate,
            gst,
            available_stock,
            minimum_stock
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *;
    `;

    const values = [
        data.product_name,
        data.glass_category,
        data.color,
        data.thickness,
        data.length,
        data.width,
        data.dimension_unit || 'mm',
        data.area,
        data.unit || 'Sq.ft',
        data.purchase_rate,
        data.selling_rate,
        data.gst || 0,
        data.available_stock || 0,
        data.minimum_stock || 0
    ];

    const { rows } = await pool.query(query, values);
    return rows[0];
};

export const updateProductInDB = async (id, data) => {
    const fields = [
        "product_name",
        "glass_category",
        "color",
        "thickness",
        "length",
        "width",
        "dimension_unit",
        "area",
        "unit",
        "purchase_rate",
        "selling_rate",
        "gst",
        "available_stock",
        "minimum_stock"
    ];

    const updates = [];
    const values = [];
    let paramIndex = 1;

    fields.forEach((field) => {
        if (data[field] !== undefined) {
            updates.push(`${field} = $${paramIndex++}`);
            values.push(data[field]);
        }
    });

    if (updates.length === 0) return null;

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
        UPDATE products
        SET ${updates.join(", ")}
        WHERE id = $${paramIndex}
        RETURNING *;
    `;

    const { rows } = await pool.query(query, values);
    return rows[0];
};

export const deleteProductInDB = async (id) => {
    const query = `
        DELETE FROM products
        WHERE id = $1
        RETURNING *;
    `;

    const { rows } = await pool.query(query, [id]);
    return rows[0];
};

export const getProductByIdFromDB = async (id) => {
    const productQuery = `
        SELECT * FROM products
        WHERE id = $1;
    `;
    const { rows: productRows } = await pool.query(productQuery, [id]);

    if (productRows.length === 0) return null;

    const storeQuery = `
        SELECT store_id, quantity, assigned_at
        FROM store_products
        WHERE product_id = $1;
    `;
    const { rows: storeRows } = await pool.query(storeQuery, [id]);

    return {
        ...productRows[0],
        assigned_stores: storeRows
    };
};

export const getAllProductsFromDB = async () => {
    const query = `
        SELECT p.*, 
               COALESCE(
                   JSON_AGG(
                       JSON_BUILD_OBJECT('store_id', sp.store_id, 'quantity', sp.quantity, 'assigned_at', sp.assigned_at)
                   ) FILTER (WHERE sp.id IS NOT NULL), '[]'
               ) AS assigned_stores
        FROM products p
        LEFT JOIN store_products sp ON p.id = sp.product_id
        GROUP BY p.id
        ORDER BY p.created_at DESC;
    `;

    const { rows } = await pool.query(query);
    return rows;
};

export const assignProductToStoreInDB = async ({ store_id, product_id, quantity }) => {
    const query = `
        INSERT INTO store_products (store_id, product_id, quantity)
        VALUES ($1, $2, $3)
        ON CONFLICT (store_id, product_id)
        DO UPDATE SET quantity = EXCLUDED.quantity, assigned_at = CURRENT_TIMESTAMP
        RETURNING *;
    `;

    const { rows } = await pool.query(query, [store_id, product_id, quantity || 0]);
    return rows[0];
};
