import pool from "../config/db.js";

export const getDashboardMetrics = async () => {
    try {
        const summaryQuery = `
            SELECT 
                (SELECT COALESCE(SUM(CASE WHEN DATE(created_at) = CURRENT_DATE THEN grand_total ELSE 0 END), 0) FROM invoices) AS today_revenue,
                (SELECT COALESCE(SUM(CASE WHEN date_trunc('month', created_at) = date_trunc('month', CURRENT_DATE) THEN grand_total ELSE 0 END), 0) FROM invoices) AS month_revenue,
                (SELECT COUNT(invoice_id) FROM invoices) AS total_bills,
                (SELECT COUNT(p.id) FROM products p JOIN glass_categories c ON p.category_id = c.id WHERE c.status = true) AS total_products,
                (SELECT COUNT(store_id) FROM stores WHERE status = true) AS total_stores;
        `;

        const lowStockQuery = `
            SELECT 
                i.store_id,
                p.product_name, 
                p.color,
                p.thickness, 
                i.available_stock, 
                i.minimum_stock
            FROM inventory i
            JOIN products p ON i.product_id = p.id
            WHERE i.available_stock <= i.minimum_stock
            ORDER BY i.available_stock ASC;
        `;

        const branchPerformanceQuery = `
            SELECT 
                store_id, 
                COALESCE(SUM(grand_total), 0) AS total_revenue
            FROM invoices
            GROUP BY store_id
            ORDER BY total_revenue DESC;
        `;

        const topSellingQuery = `
            SELECT 
                p.product_name, 
                SUM(ii.quantity) AS total_sold
            FROM invoice_items ii
            JOIN products p ON ii.product_id = p.id
            GROUP BY p.id, p.product_name
            ORDER BY total_sold DESC
            LIMIT 5;
        `;

        // Execute using pool.query directly to resolve the deprecation warning
        const [summaryRes, lowStockRes, branchRes, topSellingRes] = await Promise.all([
            pool.query(summaryQuery),
            pool.query(lowStockQuery),
            pool.query(branchPerformanceQuery),
            pool.query(topSellingQuery)
        ]);

        return {
            summary: summaryRes.rows[0],
            lowStockAlerts: lowStockRes.rows,
            branchPerformance: branchRes.rows,
            topProducts: topSellingRes.rows
        };

    } catch (error) {
        throw error;
    }
};

export const getStoreDashboardMetrics = async (storeId) => {
    try {
        // 1. Summary specific to THIS store
        const summaryQuery = `
            SELECT 
                COALESCE(SUM(CASE WHEN DATE(created_at) = CURRENT_DATE THEN grand_total ELSE 0 END), 0) AS today_revenue,
                COALESCE(SUM(CASE WHEN date_trunc('month', created_at) = date_trunc('month', CURRENT_DATE) THEN grand_total ELSE 0 END), 0) AS month_revenue,
                COUNT(invoice_id) AS total_bills
            FROM invoices
            WHERE store_id = $1;
        `;

        // 2. Low Stock Alerts for THIS store only
        const lowStockQuery = `
            SELECT 
                p.product_name, 
                p.color,
                p.thickness, 
                i.available_stock, 
                i.minimum_stock
            FROM inventory i
            JOIN products p ON i.product_id = p.id
            WHERE i.store_id = $1 AND i.available_stock <= i.minimum_stock
            ORDER BY i.available_stock ASC;
        `;

        // 3. Top 5 Selling Products for THIS store only
        const topSellingQuery = `
            SELECT 
                p.product_name, 
                SUM(ii.quantity) AS total_sold
            FROM invoice_items ii
            JOIN invoices inv ON ii.invoice_id = inv.invoice_id
            JOIN products p ON ii.product_id = p.id
            WHERE inv.store_id = $1
            GROUP BY p.id, p.product_name
            ORDER BY total_sold DESC
            LIMIT 5;
        `;

        // Execute queries concurrently for this specific store ID
        const [summaryRes, lowStockRes, topSellingRes] = await Promise.all([
            pool.query(summaryQuery, [storeId]),
            pool.query(lowStockQuery, [storeId]),
            pool.query(topSellingQuery, [storeId])
        ]);

        return {
            summary: summaryRes.rows[0],
            lowStockAlerts: lowStockRes.rows,
            topProducts: topSellingRes.rows
        };

    } catch (error) {
        throw error;
    }
};