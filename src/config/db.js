import dotenv from "dotenv";
import pkg from "pg";

dotenv.config();

const { Pool } = pkg;

const pool = new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

// Test the database connection
pool.on("connect", () => {
    console.log("✅ Connected to PostgreSQL");
});

pool.on("error", (err) => {
    console.error("❌ PostgreSQL Error:", err.message);
});

export default pool;