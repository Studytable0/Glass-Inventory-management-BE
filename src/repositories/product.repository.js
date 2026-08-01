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
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    `;

    const createInventoryTableQuery = `
        CREATE TABLE IF NOT EXISTS inventory (
            id SERIAL PRIMARY KEY,
            product_id INT NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
            purchase_rate NUMERIC(12, 2) NOT NULL,
            selling_rate NUMERIC(12, 2) NOT NULL,
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
        await pool.query(createInventoryTableQuery);
        await pool.query(createStoreProductsTableQuery);

        // Optional migration check for older products table schema
        await pool.query(`
            DO $$ 
            BEGIN 
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='glass_category') THEN
                    ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id INT REFERENCES glass_categories(id);
                    ALTER TABLE products DROP COLUMN IF EXISTS glass_category;
                END IF;
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='purchase_rate') THEN
                    ALTER TABLE products DROP COLUMN IF EXISTS purchase_rate;
                    ALTER TABLE products DROP COLUMN IF EXISTS selling_rate;
                    ALTER TABLE products DROP COLUMN IF EXISTS available_stock;
                    ALTER TABLE products DROP COLUMN IF EXISTS minimum_stock;
                END IF;
            END $$;
        `);

        console.log("✅ Product and Inventory tables initialized successfully");
    } catch (error) {
        console.error("❌ Error initializing product/inventory tables:", error.message);
    }
};

export const createProductInDB = async (productData, inventoryData) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const insertProductQuery = `
            INSERT INTO products (
                product_name,
                category_id,
                color,
                thickness,
                length,
                width,
                dimension_unit,
                area,
                unit
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *;
        `;

        const productValues = [
            productData.product_name,
            productData.category_id,
            productData.color,
            productData.thickness,
            productData.length,
            productData.width,
            productData.dimension_unit || 'mm',
            productData.area,
            productData.unit || 'Sq.ft'
        ];

        const { rows: productRows } = await client.query(insertProductQuery, productValues);
        const createdProduct = productRows[0];

        const insertInventoryQuery = `
            INSERT INTO inventory (
                product_id,
                purchase_rate,
                selling_rate,
                available_stock,
                minimum_stock
            )
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *;
        `;

        const inventoryValues = [
            createdProduct.id,
            inventoryData.purchase_rate,
            inventoryData.selling_rate,
            inventoryData.available_stock || 0,
            inventoryData.minimum_stock || 0
        ];

        const { rows: inventoryRows } = await client.query(insertInventoryQuery, inventoryValues);
        const createdInventory = inventoryRows[0];

        await client.query("COMMIT");

        return {
            ...createdProduct,
            purchase_rate: createdInventory.purchase_rate,
            selling_rate: createdInventory.selling_rate,
            available_stock: createdInventory.available_stock,
            minimum_stock: createdInventory.minimum_stock,
            inventory: createdInventory
        };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

export const updateProductInDB = async (id, productData, inventoryData) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const productFields = [
            "product_name",
            "category_id",
            "color",
            "thickness",
            "length",
            "width",
            "dimension_unit",
            "area",
            "unit"
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
            await client.query(updateProductQuery, productValues);
        }

        if (inventoryData && Object.keys(inventoryData).length > 0) {
            const inventoryFields = [
                "purchase_rate",
                "selling_rate",
                "available_stock",
                "minimum_stock"
            ];

            const inventoryUpdates = [];
            const inventoryValues = [];
            let iParamIndex = 1;

            inventoryFields.forEach((field) => {
                if (inventoryData[field] !== undefined) {
                    inventoryUpdates.push(`${field} = $${iParamIndex++}`);
                    inventoryValues.push(inventoryData[field]);
                }
            });

            if (inventoryUpdates.length > 0) {
                inventoryUpdates.push(`updated_at = CURRENT_TIMESTAMP`);
                inventoryValues.push(id);
                const updateInventoryQuery = `
                    UPDATE inventory
                    SET ${inventoryUpdates.join(", ")}
                    WHERE product_id = $${iParamIndex}
                    RETURNING *;
                `;
                await client.query(updateInventoryQuery, inventoryValues);
            }
        }

        await client.query("COMMIT");

        return getProductByIdFromDB(id);
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
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
        SELECT 
            p.*,
            gc.category_name,
            gc.description AS category_description,
            i.purchase_rate,
            i.selling_rate,
            i.available_stock,
            i.minimum_stock
        FROM products p
        LEFT JOIN glass_categories gc ON p.category_id = gc.id
        LEFT JOIN inventory i ON p.id = i.product_id
        WHERE p.id = $1;
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
        SELECT 
            p.*, 
            gc.category_name,
            gc.description AS category_description,
            i.purchase_rate,
            i.selling_rate,
            i.available_stock,
            i.minimum_stock,
            COALESCE(
                JSON_AGG(
                    JSON_BUILD_OBJECT('store_id', sp.store_id, 'quantity', sp.quantity, 'assigned_at', sp.assigned_at)
                ) FILTER (WHERE sp.id IS NOT NULL), '[]'
            ) AS assigned_stores
        FROM products p
        LEFT JOIN glass_categories gc ON p.category_id = gc.id
        LEFT JOIN inventory i ON p.id = i.product_id
        LEFT JOIN store_products sp ON p.id = sp.product_id
        GROUP BY p.id, gc.id, i.id
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
