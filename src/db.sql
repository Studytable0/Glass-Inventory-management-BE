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
