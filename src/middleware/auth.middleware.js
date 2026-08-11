import jwt from "jsonwebtoken";

export const authenticate = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({
                success: false,
                message: "Access token is required"
            });
        }

        // Expected format: Bearer <token>
        const token = authHeader.split(" ")[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Invalid authorization header"
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = decoded;

        next();

    } catch (error) {
        console.error("JWT Verification Error:", error.message);
        return res.status(401).json({
            success: false,
            message: "Invalid or expired token"
        });
    }
};

export const requireMasterAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized access"
        });
    }

    const role = req.user.role ? req.user.role.toUpperCase() : "";
    if (role !== "MASTER_ADMIN" && role !== "MASTERADMIN") {
        return res.status(403).json({
            success: false,
            message: "Access forbidden: Master Admin privileges required"
        });
    }

    next();
};

export const requireMasterOrStoreAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized access"
        });
    }

    const role = req.user.role ? req.user.role.toUpperCase() : "";
    if (role !== "MASTER_ADMIN" && role !== "MASTERADMIN" && role !== "STORE_ADMIN" && role !== "STOREADMIN") {
        return res.status(403).json({
            success: false,
            message: "Access forbidden: Master or Store Admin privileges required"
        });
    }

    next();
};