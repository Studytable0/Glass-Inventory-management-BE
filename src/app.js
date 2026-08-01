import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import authRouter from "./routes/auth.routes.js"
import productRouter from "./routes/product.routes.js";
import storeRouter from "./routes/store.routes.js";
import glassCategoryRouter from "./routes/glassCategory.routes.js";
import { authenticate } from "./middleware/auth.middleware.js";
import { initProductTables } from "./repositories/product.repository.js";
import { initGlassCategoryTable } from "./repositories/glassCategory.repository.js";

const app = express();

app.use(cors());
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());

// Initialize Database Tables
initProductTables();
initGlassCategoryTable();

// Routes
app.use("/api/auth", authRouter);
app.use("/api/products", productRouter);
app.use("/api/stores", storeRouter);
app.use("/api/glass-categories", glassCategoryRouter);




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