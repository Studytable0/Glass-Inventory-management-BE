import {
    createProductInDB,
    updateProductInDB,
    deleteProductInDB,
    getProductByIdFromDB,
    getAllProductsFromDB,
    assignProductToStoreInDB,
    getAllProductsByStoreIdFromDB
} from "../repositories/product.repository.js";
import {
    getGlassCategoryByIdFromDB,
    getGlassCategoryByNameFromDB
} from "../repositories/glassCategory.repository.js";


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
        const { product_name, category_id, glass_category, color, thickness, length, width, dimension_unit, unit, area } = req.body;

        if (!product_name || (!category_id && !glass_category) || !color || !thickness || length === undefined || width === undefined) {
            return res.status(400).json({ success: false, message: "Missing required product fields." });
        }

        let resolvedCategoryId = category_id ? parseInt(category_id, 10) : null;
        if (!resolvedCategoryId && glass_category) {
            const validCategory = await getGlassCategoryByNameFromDB(glass_category);
            if (validCategory) resolvedCategoryId = validCategory.id;
        }

        if (!resolvedCategoryId) return res.status(400).json({ success: false, message: "Invalid category." });

        const calculatedArea = area !== undefined ? parseFloat(area) : calculateArea(length, width, dimension_unit, unit);

        const newProduct = await createProductInDB({
            product_name, category_id: resolvedCategoryId, color, thickness,
            length: parseFloat(length), width: parseFloat(width),
            dimension_unit: dimension_unit || "mm", area: calculatedArea, unit: unit || "Sq.ft"
        });

        return res.status(201).json({ success: true, message: "Product master created successfully", product: newProduct });
    } catch (error) {
        console.error("Create Product Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const assignProductToStore = async (req, res) => {
    try {
        const { store_id, product_id, purchase_rate, selling_rate, quantity, minimum_stock } = req.body;

        if (!store_id || !product_id || purchase_rate === undefined || selling_rate === undefined) {
            return res.status(400).json({ success: false, message: "store_id, product_id, purchase_rate, and selling_rate are required" });
        }

        const assignment = await assignProductToStoreInDB(store_id, product_id, {
            purchase_rate: parseFloat(purchase_rate),
            selling_rate: parseFloat(selling_rate),
            available_stock: quantity !== undefined ? parseInt(quantity, 10) : 0,
            minimum_stock: minimum_stock !== undefined ? parseInt(minimum_stock, 10) : 0
        });

        return res.status(200).json({ success: true, message: "Stock and pricing updated for store!", inventory: assignment });
    } catch (error) {
        console.error("Assign Product To Store Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const updateBody = { ...req.body };

        const existingProduct = await getProductByIdFromDB(id);
        if (!existingProduct) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        let resolvedCategoryId = updateBody.category_id !== undefined ? parseInt(updateBody.category_id, 10) : existingProduct.category_id;

        if (updateBody.category_id !== undefined || updateBody.glass_category !== undefined) {
            let validCategory = null;
            if (updateBody.category_id) {
                validCategory = await getGlassCategoryByIdFromDB(updateBody.category_id);
            } else if (updateBody.glass_category) {
                validCategory = await getGlassCategoryByNameFromDB(updateBody.glass_category);
                if (validCategory) resolvedCategoryId = validCategory.id;
            }

            if (!validCategory) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid category. No category found matching '${updateBody.category_id || updateBody.glass_category}' in glass_categories table.`
                });
            }
        }

        const newLength = updateBody.length !== undefined ? updateBody.length : existingProduct.length;
        const newWidth = updateBody.width !== undefined ? updateBody.width : existingProduct.width;
        const newDimUnit = updateBody.dimension_unit !== undefined ? updateBody.dimension_unit : existingProduct.dimension_unit;
        const newUnit = updateBody.unit !== undefined ? updateBody.unit : existingProduct.unit;

        let calculatedArea = updateBody.area;
        if (updateBody.area === undefined && (updateBody.length !== undefined || updateBody.width !== undefined || updateBody.dimension_unit !== undefined || updateBody.unit !== undefined)) {
            calculatedArea = calculateArea(newLength, newWidth, newDimUnit, newUnit);
        }

        const productData = {};
        if (updateBody.product_name !== undefined) productData.product_name = updateBody.product_name;
        if (resolvedCategoryId !== undefined) productData.category_id = resolvedCategoryId;
        if (updateBody.color !== undefined) productData.color = updateBody.color;
        if (updateBody.thickness !== undefined) productData.thickness = updateBody.thickness;
        if (updateBody.length !== undefined) productData.length = parseFloat(updateBody.length);
        if (updateBody.width !== undefined) productData.width = parseFloat(updateBody.width);
        if (updateBody.dimension_unit !== undefined) productData.dimension_unit = updateBody.dimension_unit;
        if (calculatedArea !== undefined) productData.area = calculatedArea;
        if (updateBody.unit !== undefined) productData.unit = updateBody.unit;

        const inventoryData = {};
        if (updateBody.purchase_rate !== undefined) inventoryData.purchase_rate = parseFloat(updateBody.purchase_rate);
        if (updateBody.selling_rate !== undefined) inventoryData.selling_rate = parseFloat(updateBody.selling_rate);
        if (updateBody.available_stock !== undefined) inventoryData.available_stock = parseInt(updateBody.available_stock, 10);
        if (updateBody.minimum_stock !== undefined) inventoryData.minimum_stock = parseInt(updateBody.minimum_stock, 10);

        const updatedProduct = await updateProductInDB(id, productData, inventoryData);

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



export const getAllProductsByStoreId = async (req, res) => {
    try {
        const { store_id } = req.params;

        if (!store_id || isNaN(parseInt(store_id, 10))) {
            return res.status(400).json({
                success: false,
                message: "A valid store_id is required"
            });
        }

        const products = await getAllProductsByStoreIdFromDB(parseInt(store_id, 10));

        return res.status(200).json({
            success: true,
            store_id: parseInt(store_id, 10),
            count: products.length,
            products
        });
    } catch (error) {
        console.error("Get All Products By Store ID Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};

