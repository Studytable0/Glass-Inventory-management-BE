import bcrypt from "bcrypt";
import { generateToken } from "../utils/jwt.js";
import {
    findUserByEmail,
    findUserByUsername,
    findUserById,
    updateUserCredentials,
    createUser,
    createStoreAdminRecord,
} from "../repositories/auth.repository.js";

export const register = async (req, res) => {
    try {
        const { full_name, username, email, password, role } = req.body;

        // Validate required fields
        if (!full_name || !username || !email || !password || !role) {
            return res.status(400).json({
                success: false,
                message: "full_name, username, email, password, and role are required"
            });
        }

        // Validate role value
        const allowedRoles = ["MASTER_ADMIN", "STORE_ADMIN"];
        if (!allowedRoles.includes(role.toUpperCase())) {
            return res.status(400).json({
                success: false,
                message: `Invalid role. Allowed values: ${allowedRoles.join(", ")}`
            });
        }

        // Check if email already exists
        const existingEmailUser = await findUserByEmail(email);
        if (existingEmailUser) {
            return res.status(409).json({
                success: false,
                message: "Email is already registered"
            });
        }

        // Check if username already exists
        const existingUsernameUser = await findUserByUsername(username);
        if (existingUsernameUser) {
            return res.status(409).json({
                success: false,
                message: "Username is already taken"
            });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user in database
        const newUser = await createUser({
            full_name,
            username,
            email,
            password: hashedPassword,
            role: role.toUpperCase()
        });

        return res.status(201).json({
            success: true,
            message: "User registered successfully",
            user: newUser
        });

    } catch (error) {
        console.error("Register Error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check if email and password are provided
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required"
            });
        }

        // Find user in database
        const user = await findUserByEmail(email);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        // Compare password
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        // Generate JWT Token
        const token = generateToken(user);

        // Remove password before sending response
        delete user.password;

        return res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            user
        });

    } catch (error) {
        console.error("Login Error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};

export const updateMasterAdminCredentials = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { email, username, currentPassword, newPassword } = req.body;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized access"
            });
        }

        // Fetch user from database
        const user = await findUserById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Verify Master Admin role
        if (user.role && user.role.toUpperCase() !== "MASTER_ADMIN" && user.role.toUpperCase() !== "MASTERADMIN") {
            return res.status(403).json({
                success: false,
                message: "Access forbidden: Master Admin privileges required"
            });
        }

        if (!email && !username && !newPassword) {
            return res.status(400).json({
                success: false,
                message: "Please provide at least one field to update (email, username, or newPassword)"
            });
        }

        // If updating password or if currentPassword is provided, verify currentPassword
        if (newPassword || currentPassword) {
            if (!currentPassword) {
                return res.status(400).json({
                    success: false,
                    message: "Current password is required to update credentials"
                });
            }

            const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);

            if (!isCurrentPasswordValid) {
                return res.status(401).json({
                    success: false,
                    message: "Incorrect current password"
                });
            }
        }

        const updateData = {};

        // If email is changed, verify uniqueness
        if (email && email !== user.email) {
            const existingEmailUser = await findUserByEmail(email);
            if (existingEmailUser && existingEmailUser.id !== userId) {
                return res.status(409).json({
                    success: false,
                    message: "Email is already in use by another user"
                });
            }
            updateData.email = email;
        }

        // If username is changed, verify uniqueness
        if (username && username !== user.username) {
            const existingUsernameUser = await findUserByUsername(username);
            if (existingUsernameUser && existingUsernameUser.id !== userId) {
                return res.status(409).json({
                    success: false,
                    message: "Username is already in use by another user"
                });
            }
            updateData.username = username;
        }

        // If new password is provided, hash it
        if (newPassword) {
            updateData.password = await bcrypt.hash(newPassword, 10);
        }

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({
                success: false,
                message: "No changes detected"
            });
        }

        const updatedUser = await updateUserCredentials(userId, updateData);

        return res.status(200).json({
            success: true,
            message: "Master admin credentials updated successfully",
            user: updatedUser
        });

    } catch (error) {
        console.error("Update Master Admin Credentials Error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};

export const createStoreAdmin = async (req, res) => {
    try {
        // 1. Verify Master Admin Role
        const userRole = req.user?.role;
        
        if (!userRole || (userRole.toUpperCase() !== "MASTER_ADMIN" && userRole.toUpperCase() !== "MASTERADMIN")) {
            return res.status(403).json({
                success: false,
                message: "Access forbidden: Only Master Admin can create store admins"
            });
        }

        // 2. Extract Input Data
        const { store_id, full_name, username, email, password } = req.body;

        // 3. Validate Required Fields
        if (!store_id || !full_name || !username || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "store_id, full_name, username, email, and password are required fields"
            });
        }

        // 4. Check for Duplicate Email
        const existingEmail = await findUserByEmail(email);
        if (existingEmail) {
            return res.status(409).json({
                success: false,
                message: "A user with this email already exists"
            });
        }

        // 5. Check for Duplicate Username
        const existingUsername = await findUserByUsername(username);
        if (existingUsername) {
            return res.status(409).json({
                success: false,
                message: "This username is already taken"
            });
        }

        // 6. Hash the Password securely
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // 7. Save Store Admin to Database
        const newStoreAdmin = await createStoreAdminRecord({
            store_id,
            full_name,
            username,
            email,
            password: hashedPassword
        });

        // 8. Send Success Response
        return res.status(201).json({
            success: true,
            message: "Store Admin created successfully",
            user: newStoreAdmin
        });

    } catch (error) {
        console.error("Create Store Admin Error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};






