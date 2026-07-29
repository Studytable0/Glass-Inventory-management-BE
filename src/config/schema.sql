-- SQL Schema for Glass Inventory Management System

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

CREATE TABLE IF NOT EXISTS store_products (
    id SERIAL PRIMARY KEY,
    store_id INT NOT NULL,
    product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INT DEFAULT 0,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(store_id, product_id)
);
