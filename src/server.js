import dotenv from "dotenv";
import app from "./app.js";
import pool from "./config/db.js";

dotenv.config();

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        // Test database connection
        await pool.query("SELECT NOW()");
        console.log("✅ PostgreSQL Connected Successfully");

        // Start Express Server
        app.listen(PORT, () => {
            console.log(`🚀 Server is running on http://localhost:${PORT}`);
        });

    } catch (error) {
        console.error("❌ Failed to connect to PostgreSQL");
        console.error(error.message);
        process.exit(1);
    }
};

startServer();