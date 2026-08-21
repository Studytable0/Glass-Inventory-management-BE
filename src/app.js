import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import authRouter from "./routes/auth.routes.js"
import productRouter from "./routes/product.routes.js";
import storeRouter from "./routes/store.routes.js";
import inventoryRouter from "./routes/inventory.routes.js";
import glassCategoryRouter from "./routes/glassCategory.routes.js";
import { authenticate } from "./middleware/auth.middleware.js";
import billingRouter from "./routes/billing.routes.js";
import { initProductTables } from "./repositories/product.repository.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import { initGlassCategoryTable } from "./repositories/glassCategory.repository.js";

const app = express();

app.use(cors({
    origin: "http://glass.ddlearning.in",
    credentials: true
}));
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());

import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
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
app.use("/api/billing", billingRouter);
app.use("/api/dashboard", dashboardRoutes);




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
