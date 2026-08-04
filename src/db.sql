-- Creating User
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    store_id INT,
    full_name VARCHAR(100) NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(150) UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('MASTER_ADMIN', 'STORE_ADMIN')),
    status BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Creating stores
CREATE TABLE stores (
    store_id SERIAL PRIMARY KEY,
    store_email VARCHAR(255) UNIQUE NOT NULL,
    store_name VARCHAR(255) NOT NULL,
    store_location TEXT NOT NULL,
    status BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Creating glass_categories table
CREATE TABLE glass_categories (
    id SERIAL PRIMARY KEY,
    category_name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    status BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Creating products table
CREATE TABLE products (
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
    product_image TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Creating inventory table
CREATE TABLE inventory (
    id SERIAL PRIMARY KEY,
    product_id INT NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
    purchase_rate NUMERIC(12, 2) NOT NULL,
    selling_rate NUMERIC(12, 2) NOT NULL,
    available_stock INT DEFAULT 0,
    minimum_stock INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 1. Fix Inventory to track stock PER STORE
-- First, drop the global unique constraint on product_id
ALTER TABLE inventory DROP CONSTRAINT IF EXISTS inventory_product_id_key;
-- Add store_id to inventory
ALTER TABLE inventory ADD COLUMN store_id INT REFERENCES stores(store_id) ON DELETE CASCADE;
-- Make the combination of store + product unique (so Store 1 and Store 2 can have different stock of the same product)
ALTER TABLE inventory ADD CONSTRAINT unique_store_product UNIQUE (store_id, product_id);

-- 2. Create Invoices (Bills) Table
CREATE TABLE invoices (
    invoice_id SERIAL PRIMARY KEY,
    store_id INT NOT NULL REFERENCES stores(store_id) ON DELETE RESTRICT,
    billed_by INT NOT NULL REFERENCES users(id) ON DELETE RESTRICT, -- The store admin who made the bill
    customer_name VARCHAR(150),
    customer_phone VARCHAR(15),
    sub_total NUMERIC(12, 2) NOT NULL,
    total_gst NUMERIC(12, 2) DEFAULT 0.00,
    grand_total NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create Invoice Items Table (What exactly was sold in the bill)
CREATE TABLE invoice_items (
    item_id SERIAL PRIMARY KEY,
    invoice_id INT NOT NULL REFERENCES invoices(invoice_id) ON DELETE CASCADE,
    product_id INT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity INT NOT NULL,
    unit_price NUMERIC(12, 2) NOT NULL, -- Selling rate at the time of sale
    total_price NUMERIC(12, 2) NOT NULL
);

-- 4. Add product_image to products table if not exists (Utility query for existing setups)
ALTER TABLE products ADD COLUMN IF NOT EXISTS product_image TEXT;