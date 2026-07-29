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

// Add this right before `export default pool;

const testConnection = async () => {
    try {
        // We run a simple query asking the database for the current time
        const res = await pool.query('SELECT NOW()');
        console.log("🟢 Database Connection Successful!");
        console.log("🕒 Database Time:", res.rows[0].now);
    } catch (err) {
        console.error("🔴 Database Connection Failed:", err.message);
    }
};

// Execute the test
testConnection();

export default pool;