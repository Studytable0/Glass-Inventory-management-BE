-- SQL Schema for Glass Inventory Management System

-- Glass Categories Table
CREATE TABLE IF NOT EXISTS glass_categories (
    id SERIAL PRIMARY KEY,
    category_name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    status BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Products Table
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    product_name VARCHAR(255) NOT NULL,
    category_id INT NOT NULL REFERENCES glass_categories(id) ON DELETE RESTRICT,
    color VARCHAR(50) NOT NULL,
    thickness VARCHAR(50) NOT NULL,
    length NUMERIC(10, 2) NOT NULL,
    width NUMERIC(10, 2) NOT NULL,
    dimension_unit VARCHAR(20) DEFAULT 'mm',
    area NUMERIC(10, 4) NOT NULL,
    unit VARCHAR(20) DEFAULT 'Sq.ft',
    gst NUMERIC(5, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Inventory Table
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

-- Store Products Junction Table
CREATE TABLE IF NOT EXISTS store_products (
    id SERIAL PRIMARY KEY,
    store_id INT NOT NULL,
    product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INT DEFAULT 0,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(store_id, product_id)
);
