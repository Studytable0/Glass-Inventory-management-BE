import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import authRouter from "./routes/auth.routes.js"
import productRouter from "./routes/product.routes.js";
import storeRouter from "./routes/store.routes.js";
import inventoryRouter from "./routes/inventory.routes.js";
import glassCategoryRouter from "./routes/glassCategory.routes.js";
import { authenticate } from "./middleware/auth.middleware.js";
import { initProductTables } from "./repositories/product.repository.js";
import { initGlassCategoryTable } from "./repositories/glassCategory.repository.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());

// Serve uploaded product images as static files
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

// Initialize Database Tables
initProductTables();
initGlassCategoryTable();

// Routes
app.use("/api/auth", authRouter);
app.use("/api/products", productRouter);
app.use("/api/stores", storeRouter);
app.use("/api/glass-categories", glassCategoryRouter);
app.use("/api/inventory", inventoryRouter);




app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Glass Inventory Backend Running 🚀",
    });
});

app.get("/api/profile", authenticate, (req, res)=> {
    return res.status(200).json({
        success: true,
        user: req.user
    });
});

export default app;

// Multer error handler (must be defined after routes)
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
    if (err.name === "MulterError" || (err.message && err.message.includes("Only image files"))) {
        return res.status(400).json({ success: false, message: err.message });
    }
    console.error("Unhandled Error:", err);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
});