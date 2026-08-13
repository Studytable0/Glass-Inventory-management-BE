import {
    createProductInDB,
    updateProductInDB,
    deleteProductInDB,
    getProductByIdFromDB,
    getAllProductsFromDB,
    assignProductToStoreInDB,
    removeProductFromStoreInDB,
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

    const dUnit = String(dimensionUnit).toLowerCase();
    const outUnit = String(unit).toLowerCase();

    let lengthInFeet = 0;
    let widthInFeet = 0;

    // 1. Convert individual dimensions to Feet first
    if (dUnit.includes("feet") || dUnit === "ft") {
        lengthInFeet = l;
        widthInFeet = w;
    } 
    else if (dUnit.includes("inch") || dUnit === "in") {
        lengthInFeet = l / 12.0;
        widthInFeet = w / 12.0;
    } 
    else {
        // Defaults to millimeters (1 foot = 304.8 mm)
        lengthInFeet = l / 304.8;
        widthInFeet = w / 304.8;
    }

    // 2. Calculate Area in Square Feet
    const areaSqFt = lengthInFeet * widthInFeet;

    // 3. Convert to Sq.m if requested, otherwise return Sq.ft
    const isSqM = outUnit === "sq.m" || outUnit === "sqm" || outUnit.includes("meter");
    
    if (isSqM) {
        return parseFloat((areaSqFt * 0.092903).toFixed(4));
    } 

    return parseFloat(areaSqFt.toFixed(4));
};

const resolveProductImageValue = (req, incomingValue) => {
    if (req.file) {
        // Return a relative path so the frontend can append its own base URL.
        // This ensures the image loads on any device, not just localhost.
        return `/uploads/products/${req.file.filename}`;
    }

    if (incomingValue !== undefined) {
        return incomingValue === "" ? null : incomingValue;
    }

    return undefined;
};

export const createProduct = async (req, res) => {
    try {
        const { product_name, category_id, glass_category, color, thickness, product_image } = req.body;

        if (!product_name || (!category_id && !glass_category) || !color || !thickness) {
            return res.status(400).json({ success: false, message: "Missing required product fields." });
        }

        let resolvedCategoryId = category_id ? parseInt(category_id, 10) : null;
        if (!resolvedCategoryId && glass_category) {
            const validCategory = await getGlassCategoryByNameFromDB(glass_category);
            if (validCategory) resolvedCategoryId = validCategory.id;
        }

        if (!resolvedCategoryId) return res.status(400).json({ success: false, message: "Invalid category." });

        const productImage = resolveProductImageValue(req, product_image);

        const newProduct = await createProductInDB({
            product_name, category_id: resolvedCategoryId, color, thickness,
            length: 0, width: 0,
            dimension_unit: "mm", area: 0, unit: "Sq.ft",
            product_image: productImage
        });

        return res.status(201).json({ success: true, message: "Product master created successfully", product: newProduct });
    } catch (error) {
        console.error("Create Product Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const assignProductToStore = async (req, res) => {
    try {
        const {
            store_id,
            product_id,
            purchase_rate = 0,
            selling_rate = 0,
            quantity = 0,
            minimum_stock = 0
        } = req.body;

        if (!store_id || !product_id) {
            return res.status(400).json({ success: false, message: "store_id and product_id are required" });
        }

        const assignment = await assignProductToStoreInDB(store_id, product_id, {
            purchase_rate: parseFloat(purchase_rate) || 0,
            selling_rate: parseFloat(selling_rate) || 0,
            available_stock: parseInt(quantity, 10) || 0,
            minimum_stock: parseInt(minimum_stock, 10) || 0
        });

        return res.status(200).json({ success: true, message: "Product Assigned to Store", inventory: assignment });
    } catch (error) {
        console.error("Assign Product To Store Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const removeProductFromStore = async (req, res) => {
    try {
        const { store_id, product_id } = req.body;

        if (!store_id || !product_id) {
            return res.status(400).json({ success: false, message: "store_id and product_id are required" });
        }

        const removedRecord = await removeProductFromStoreInDB(store_id, product_id);
        if (!removedRecord) {
            return res.status(404).json({ success: false, message: "Product not found in the specified store" });
        }

        return res.status(200).json({ success: true, message: "Product removed from store", inventory: removedRecord });
    } catch (error) {
        console.error("Remove Product From Store Error:", error);
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

        const productData = {};
        if (updateBody.product_name !== undefined) productData.product_name = updateBody.product_name;
        if (resolvedCategoryId !== undefined) productData.category_id = resolvedCategoryId;
        if (updateBody.color !== undefined) productData.color = updateBody.color;
        if (updateBody.thickness !== undefined) productData.thickness = updateBody.thickness;

        const productImageValue = resolveProductImageValue(req, updateBody.product_image);
        if (productImageValue !== undefined) {
            productData.product_image = productImageValue;
        }

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
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const offset = (page - 1) * limit;

        const { products, totalCount } = await getAllProductsFromDB(limit, offset);
        const totalPages = Math.ceil(totalCount / limit);

        return res.status(200).json({
            success: true,
            count: products.length,
            totalCount,
            totalPages,
            currentPage: page,
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

