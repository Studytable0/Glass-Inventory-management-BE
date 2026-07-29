-- Creating stores
CREATE TABLE stores (
    store_id SERIAL PRIMARY KEY,
    store_email VARCHAR(255) UNIQUE NOT NULL,
    store_name VARCHAR(255) NOT NULL,
    store_location TEXT NOT NULL,
    status BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
