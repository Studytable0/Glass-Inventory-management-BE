import bcrypt from "bcrypt";
import pool from "./src/config/db.js"; // <-- Path corrected here

const seedAdminUser = async () => {
    const plainTextPassword = "admin@123";
    
    try {
        const hashedPassword = await bcrypt.hash(plainTextPassword, 12);
        
        const query = `
            INSERT INTO users (user_name, email, phone, password, user_type)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING user_id, user_name, email, user_type;
        `;
        
        const values = [
            "Master Admin",
            "admin@glasserp.com",
            "9876543210",
            hashedPassword,
            "master_admin"
        ];
        
        const { rows } = await pool.query(query, values);
        
        console.log("✅ Master Admin created successfully!");
        console.log("Details:", rows[0]);
        console.log("You can now log in with email: admin@glasserp.com and password: admin@123");

    } catch (error) {
        console.error("❌ Database Error:", error.message);
    } finally {
        await pool.end(); 
    }
};

seedAdminUser();