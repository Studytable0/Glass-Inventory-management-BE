import {
    createGlassCategoryInDB,
    getAllGlassCategoriesFromDB,
    getGlassCategoryByIdFromDB,
    getGlassCategoryByNameFromDB,
    updateGlassCategoryInDB,
    deleteGlassCategoryInDB
} from "../repositories/glassCategory.repository.js";

export const createGlassCategory = async (req, res) => {
    try {
        const { category_name, description } = req.body;

        if (!category_name || typeof category_name !== "string" || !category_name.trim()) {
            return res.status(400).json({
                success: false,
                message: "category_name is required and must be a non-empty string."
            });
        }

        const existingCategory = await getGlassCategoryByNameFromDB(category_name);
        if (existingCategory) {
            return res.status(400).json({
                success: false,
                message: `Glass category '${category_name.trim()}' already exists.`
            });
        }

        const newCategory = await createGlassCategoryInDB({
            category_name,
            description
        });

        return res.status(201).json({
            success: true,
            message: "Glass category created successfully",
            category: newCategory
        });
    } catch (error) {
        console.error("Create Glass Category Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};

export const getAllGlassCategories = async (req, res) => {
    try {
        const categories = await getAllGlassCategoriesFromDB();

        return res.status(200).json({
            success: true,
            count: categories.length,
            categories
        });
    } catch (error) {
        console.error("Get All Glass Categories Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};

export const getGlassCategoryByID = async (req, res) => {
    try {
        const { id } = req.params;

        const category = await getGlassCategoryByIdFromDB(id);
        if (!category) {
            return res.status(404).json({
                success: false,
                message: "Glass category not found"
            });
        }

        return res.status(200).json({
            success: true,
            category
        });
    } catch (error) {
        console.error("Get Glass Category By ID Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};

export const updateGlassCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { category_name, description, status } = req.body;

        const existingCategory = await getGlassCategoryByIdFromDB(id);
        if (!existingCategory) {
            return res.status(404).json({
                success: false,
                message: "Glass category not found"
            });
        }

        if (category_name && category_name.trim().toLowerCase() !== existingCategory.category_name.toLowerCase()) {
            const duplicate = await getGlassCategoryByNameFromDB(category_name);
            if (duplicate) {
                return res.status(400).json({
                    success: false,
                    message: `Glass category '${category_name.trim()}' already exists.`
                });
            }
        }

        const updatedCategory = await updateGlassCategoryInDB(id, {
            category_name,
            description,
            status
        });

        return res.status(200).json({
            success: true,
            message: "Glass category updated successfully",
            category: updatedCategory
        });
    } catch (error) {
        console.error("Update Glass Category Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};

export const deleteGlassCategory = async (req, res) => {
    try {
        const { id } = req.params;

        const deletedCategory = await deleteGlassCategoryInDB(id);
        if (!deletedCategory) {
            return res.status(404).json({
                success: false,
                message: "Glass category not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Glass category deleted successfully",
            category: deletedCategory
        });
    } catch (error) {
        console.error("Delete Glass Category Error:", error);

        // PostgreSQL error code for foreign_key_violation
        if (error.code === '23503') {
            return res.status(400).json({
                success: false,
                message: "Cannot delete this category because it is currently assigned to one or more products."
            });
        }

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};
