import {
    createProductInDB,
    updateProductInDB,
    deleteProductInDB,
    getProductByIdFromDB,
    getAllProductsFromDB,
    assignProductToStoreInDB
} from "../repositories/product.repository.js";

const calculateArea = (length, width, dimensionUnit = "mm", unit = "Sq.ft") => {
    const l = parseFloat(length);
    const w = parseFloat(width);

    if (isNaN(l) || isNaN(w)) return 0;

    const isFeet = String(dimensionUnit).toLowerCase().includes("feet") || String(dimensionUnit).toLowerCase() === "ft";
    const isSqM = String(unit).toLowerCase() === "sq.m" || String(unit).toLowerCase() === "sqm";

    if (isFeet) {
        const areaSqFt = l * w;
        return isSqM ? parseFloat((areaSqFt * 0.092903).toFixed(4)) : parseFloat(areaSqFt.toFixed(4));
    } else {
        // Dimension in mm
        const areaSqMm = l * w;
        if (isSqM) {
            return parseFloat((areaSqMm / 1000000).toFixed(4));
        } else {
            // Sq.ft
            return parseFloat((areaSqMm / 92903.04).toFixed(4));
        }
    }
};

export const createProduct = async (req, res) => {
    try {
        const {
            product_name,
            glass_category,
            color,
            thickness,
            length,
            width,
            dimension_unit,
            unit,
            purchase_rate,
            selling_rate,
            gst,
            available_stock,
            minimum_stock,
            area
        } = req.body;

        if (!product_name || !glass_category || !color || !thickness || length === undefined || width === undefined || purchase_rate === undefined || selling_rate === undefined) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields: product_name, glass_category, color, thickness, length, width, purchase_rate, selling_rate are required."
            });
        }

        const calculatedArea = area !== undefined ? parseFloat(area) : calculateArea(length, width, dimension_unit, unit);

        const newProduct = await createProductInDB({
            product_name,
            glass_category,
            color,
            thickness,
            length: parseFloat(length),
            width: parseFloat(width),
            dimension_unit: dimension_unit || "mm",
            area: calculatedArea,
            unit: unit || "Sq.ft",
            purchase_rate: parseFloat(purchase_rate),
            selling_rate: parseFloat(selling_rate),
            gst: gst !== undefined ? parseFloat(gst) : 0,
            available_stock: available_stock !== undefined ? parseInt(available_stock, 10) : 0,
            minimum_stock: minimum_stock !== undefined ? parseInt(minimum_stock, 10) : 0
        });

        return res.status(201).json({
            success: true,
            message: "Product created successfully",
            product: newProduct
        });
    } catch (error) {
        console.error("Create Product Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};

export const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const updateFields = { ...req.body };

        const existingProduct = await getProductByIdFromDB(id);
        if (!existingProduct) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        // Recalculate area if length, width, dimension_unit, or unit are updated
        const newLength = updateFields.length !== undefined ? updateFields.length : existingProduct.length;
        const newWidth = updateFields.width !== undefined ? updateFields.width : existingProduct.width;
        const newDimUnit = updateFields.dimension_unit !== undefined ? updateFields.dimension_unit : existingProduct.dimension_unit;
        const newUnit = updateFields.unit !== undefined ? updateFields.unit : existingProduct.unit;

        if (updateFields.area === undefined && (updateFields.length !== undefined || updateFields.width !== undefined || updateFields.dimension_unit !== undefined || updateFields.unit !== undefined)) {
            updateFields.area = calculateArea(newLength, newWidth, newDimUnit, newUnit);
        }

        const updatedProduct = await updateProductInDB(id, updateFields);

        return res.status(200).json({
            success: true,
            message: "Product updated successfully",
            product: updatedProduct
        });
    } catch (error) {
        console.error("Update Product Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};

export const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;

        const deletedProduct = await deleteProductInDB(id);
        if (!deletedProduct) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Product deleted successfully",
            product: deletedProduct
        });
    } catch (error) {
        console.error("Delete Product Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};

export const getProductByID = async (req, res) => {
    try {
        const { id } = req.params;

        const product = await getProductByIdFromDB(id);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        return res.status(200).json({
            success: true,
            product
        });
    } catch (error) {
        console.error("Get Product By ID Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};

export const getAllProducts = async (req, res) => {
    try {
        const products = await getAllProductsFromDB();

        return res.status(200).json({
            success: true,
            count: products.length,
            products
        });
    } catch (error) {
        console.error("Get All Products Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};

export const assignProductToStore = async (req, res) => {
    try {
        const { store_id, product_id, quantity } = req.body;

        if (!store_id || !product_id) {
            return res.status(400).json({
                success: false,
                message: "store_id and product_id are required"
            });
        }

        const product = await getProductByIdFromDB(product_id);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        const assignment = await assignProductToStoreInDB({
            store_id: parseInt(store_id, 10),
            product_id: parseInt(product_id, 10),
            quantity: quantity !== undefined ? parseInt(quantity, 10) : 0
        });

        return res.status(200).json({
            success: true,
            message: "Product assigned to store successfully",
            assignment
        });
    } catch (error) {
        console.error("Assign Product To Store Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};
