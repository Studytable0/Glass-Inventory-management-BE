import pool from "./src/config/db.js";

async function run() {
    try {
        await pool.query("ALTER TABLE products ADD COLUMN IF NOT EXISTS product_image TEXT;");
        console.log("Successfully added product_image column to products table.");
    } catch (e) {
        console.error("Error adding column", e);
    } finally {
        pool.end();
    }
}
run();
