import pool from "../config/db.js";

export const initProductTables = async () => {
    const createProductsTableQuery = `
        CREATE TABLE IF NOT EXISTS products (
            id SERIAL PRIMARY KEY,
            product_name VARCHAR(255) NOT NULL,
            category_id INT REFERENCES glass_categories(id) ON DELETE RESTRICT,
            color VARCHAR(50) NOT NULL,
            thickness VARCHAR(50) NOT NULL,
            length NUMERIC(10, 2) NOT NULL,
            width NUMERIC(10, 2) NOT NULL,
            dimension_unit VARCHAR(20) DEFAULT 'mm',
            area NUMERIC(10, 4) NOT NULL,
            unit VARCHAR(20) DEFAULT 'Sq.ft',
            product_image TEXT DEFAULT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    `;

    // Merged inventory and store_products into one powerful table
    const createInventoryTableQuery = `
        CREATE TABLE IF NOT EXISTS inventory (
            id SERIAL PRIMARY KEY,
            store_id INT NOT NULL,
            product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
            purchase_rate NUMERIC(12, 2) NOT NULL,
            selling_rate NUMERIC(12, 2) NOT NULL,
            available_stock INT DEFAULT 0,
            minimum_stock INT DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(store_id, product_id)
        );
    `;

    try {
        await pool.query(createProductsTableQuery);
        await pool.query(createInventoryTableQuery);
        console.log("✅ Product and Inventory tables initialized successfully");
    } catch (error) {
        console.error("❌ Error initializing product/inventory tables:", error.message);
    }
};

export const createProductInDB = async (productData) => {
    const query = `
        INSERT INTO products (product_name, category_id, color, thickness, length, width, dimension_unit, area, unit, product_image)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *;
    `;
    const values = [
        productData.product_name, productData.category_id, productData.color, 
        productData.thickness, productData.length, productData.width, 
        productData.dimension_unit || 'mm', productData.area, productData.unit || 'Sq.ft',
        productData.product_image ?? null
    ];
    const { rows } = await pool.query(query, values);
    return rows[0];
};

export const assignProductToStoreInDB = async (store_id, product_id, inventoryData) => {
    // This perfectly handles BOTH adding a new product to a store AND updating existing stock/prices
    const query = `
        INSERT INTO inventory (store_id, product_id, purchase_rate, selling_rate, available_stock, minimum_stock)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (store_id, product_id)
        DO UPDATE SET 
            purchase_rate = EXCLUDED.purchase_rate,
            selling_rate = EXCLUDED.selling_rate,
            available_stock = inventory.available_stock + EXCLUDED.available_stock, 
            minimum_stock = EXCLUDED.minimum_stock,
            updated_at = CURRENT_TIMESTAMP
        RETURNING *;
    `;
    const values = [
        store_id, product_id, inventoryData.purchase_rate, inventoryData.selling_rate, 
        inventoryData.available_stock || 0, inventoryData.minimum_stock || 0
    ];
    const { rows } = await pool.query(query, values);
    return rows[0];
};

export const removeProductFromStoreInDB = async (store_id, product_id) => {
    const query = `
        DELETE FROM inventory
        WHERE store_id = $1 AND product_id = $2
        RETURNING *;
    `;
    const { rows } = await pool.query(query, [store_id, product_id]);
    return rows[0] || null;
};

export const getProductByIdFromDB = async (id) => {
    const productQuery = `
        SELECT p.*, gc.category_name, gc.description AS category_description,
            CASE 
                WHEN p.length <= 12 THEN 12
                WHEN p.length <= 18 THEN 18
                WHEN p.length <= 24 THEN 24
                WHEN p.length <= 36 THEN 36
                ELSE p.length
            END AS billing_length,
            CASE 
                WHEN p.width <= 12 THEN 12
                WHEN p.width <= 18 THEN 18
                WHEN p.width <= 24 THEN 24
                WHEN p.width <= 36 THEN 36
                ELSE p.width
            END AS billing_width
        FROM products p
        LEFT JOIN glass_categories gc ON p.category_id = gc.id
        WHERE p.id = $1;
    `;
    const { rows: productRows } = await pool.query(productQuery, [id]);
    if (productRows.length === 0) return null;

    const inventoryQuery = `
        SELECT store_id, purchase_rate, selling_rate, available_stock, minimum_stock, updated_at
        FROM inventory WHERE product_id = $1;
    `;
    const { rows: inventoryRows } = await pool.query(inventoryQuery, [id]);

    return { ...productRows[0], store_inventory: inventoryRows };
};

export const getAllProductsFromDB = async (limit = 10, offset = 0) => {
    const query = `
        SELECT p.*, gc.category_name,
            CASE 
                WHEN p.length <= 12 THEN 12
                WHEN p.length <= 18 THEN 18
                WHEN p.length <= 24 THEN 24
                WHEN p.length <= 36 THEN 36
                ELSE p.length
            END AS billing_length,
            CASE 
                WHEN p.width <= 12 THEN 12
                WHEN p.width <= 18 THEN 18
                WHEN p.width <= 24 THEN 24
                WHEN p.width <= 36 THEN 36
                ELSE p.width
            END AS billing_width,
            COALESCE(
                JSON_AGG(
                    JSON_BUILD_OBJECT(
                        'store_id', i.store_id, 'available_stock', i.available_stock, 
                        'selling_rate', i.selling_rate
                    )
                ) FILTER (WHERE i.id IS NOT NULL), '[]'
            ) AS store_inventory
        FROM products p
        LEFT JOIN glass_categories gc ON p.category_id = gc.id
        LEFT JOIN inventory i ON p.id = i.product_id
        GROUP BY p.id, gc.id
        ORDER BY p.created_at DESC
        LIMIT $1 OFFSET $2;
    `;
    const { rows } = await pool.query(query, [limit, offset]);
    
    const countQuery = `SELECT COUNT(*) FROM products;`;
    const countResult = await pool.query(countQuery);
    const totalCount = parseInt(countResult.rows[0].count, 10);
    
    return { products: rows, totalCount };
};

// 1. Update Product (Catalog Only - Pricing is now updated per store via assignProductToStore)
export const updateProductInDB = async (id, productData) => {
    const productFields = [
        "product_name", "category_id", "color", "thickness", 
        "length", "width", "dimension_unit", "area", "unit", "product_image"
    ];

    const productUpdates = [];
    const productValues = [];
    let pParamIndex = 1;

    productFields.forEach((field) => {
        if (productData[field] !== undefined) {
            productUpdates.push(`${field} = $${pParamIndex++}`);
            productValues.push(productData[field]);
        }
    });

    if (productUpdates.length > 0) {
        productUpdates.push(`updated_at = CURRENT_TIMESTAMP`);
        productValues.push(id);
        const updateProductQuery = `
            UPDATE products
            SET ${productUpdates.join(", ")}
            WHERE id = $${pParamIndex}
            RETURNING *;
        `;
        await pool.query(updateProductQuery, productValues);
    }
    
    return getProductByIdFromDB(id);
};

// 2. Delete Product (This automatically deletes the stock from all stores due to ON DELETE CASCADE)
export const deleteProductInDB = async (id) => {
    const query = `
        DELETE FROM products
        WHERE id = $1
        RETURNING *;
    `;
    const { rows } = await pool.query(query, [id]);
    return rows[0];
};

// 3. Get All Products specific to one Store
export const getAllProductsByStoreIdFromDB = async (store_id) => {
    const query = `
        SELECT
            p.*,
            CASE 
                WHEN p.length <= 12 THEN 12
                WHEN p.length <= 18 THEN 18
                WHEN p.length <= 24 THEN 24
                WHEN p.length <= 36 THEN 36
                ELSE p.length
            END AS billing_length,
            CASE 
                WHEN p.width <= 12 THEN 12
                WHEN p.width <= 18 THEN 18
                WHEN p.width <= 24 THEN 24
                WHEN p.width <= 36 THEN 36
                ELSE p.width
            END AS billing_width,
            gc.category_name,
            gc.description AS category_description,
            i.purchase_rate,
            i.selling_rate,
            i.available_stock,
            i.minimum_stock,
            i.updated_at AS assigned_at
        FROM inventory i
        INNER JOIN products p ON i.product_id = p.id
        LEFT JOIN glass_categories gc ON p.category_id = gc.id
        WHERE i.store_id = $1
        ORDER BY i.updated_at DESC;
    `;
    const { rows } = await pool.query(query, [store_id]);
    return rows;
};