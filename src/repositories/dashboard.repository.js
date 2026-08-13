import pool from "../config/db.js";

// ==========================================
// MASTER ADMIN DASHBOARD METRICS
// ==========================================
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
                i.store_id, 
                s.store_name,
                COALESCE(SUM(i.grand_total), 0) AS total_revenue
            FROM invoices i
            JOIN stores s ON i.store_id = s.store_id
            GROUP BY i.store_id, s.store_name
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

        const monthlyRevenueQuery = `
            SELECT 
                TO_CHAR(date_trunc('month', created_at), 'Mon YYYY') AS month,
                COALESCE(SUM(grand_total), 0) AS revenue
            FROM invoices
            WHERE created_at >= NOW() - INTERVAL '6 months'
            GROUP BY date_trunc('month', created_at)
            ORDER BY date_trunc('month', created_at) ASC;
        `;

        const [summaryRes, lowStockRes, branchRes, topSellingRes, monthlyRevRes] = await Promise.all([
            pool.query(summaryQuery),
            pool.query(lowStockQuery),
            pool.query(branchPerformanceQuery),
            pool.query(topSellingQuery),
            pool.query(monthlyRevenueQuery)
        ]);

        return {
            summary: summaryRes.rows[0],
            lowStockAlerts: lowStockRes.rows,
            branchPerformance: branchRes.rows,
            topProducts: topSellingRes.rows,
            monthlyRevenue: monthlyRevRes.rows 
        };

    } catch (error) {
        throw error;
    }
};

// ==========================================
// STORE ADMIN DASHBOARD METRICS
// ==========================================
export const getStoreDashboardMetrics = async (storeId) => {
    try {
        const summaryQuery = `
            SELECT 
                (SELECT COALESCE(SUM(CASE WHEN DATE(created_at) = CURRENT_DATE THEN grand_total ELSE 0 END), 0) FROM invoices WHERE store_id = $1) AS today_revenue,
                (SELECT COALESCE(SUM(CASE WHEN date_trunc('month', created_at) = date_trunc('month', CURRENT_DATE) THEN grand_total ELSE 0 END), 0) FROM invoices WHERE store_id = $1) AS month_revenue,
                (SELECT COUNT(invoice_id) FROM invoices WHERE store_id = $1) AS total_bills,
                (SELECT COUNT(product_id) FROM inventory WHERE store_id = $1) AS total_products,
                (SELECT COALESCE(SUM(available_stock), 0) FROM inventory WHERE store_id = $1) AS total_stock_units,
                (SELECT COUNT(*) FROM inventory WHERE store_id = $1 AND available_stock <= 0) AS out_of_stock_count;
        `;

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

        const monthlyRevenueQuery = `
            SELECT 
                TO_CHAR(date_trunc('month', created_at), 'Mon YYYY') AS month,
                COALESCE(SUM(grand_total), 0) AS revenue
            FROM invoices
            WHERE store_id = $1 
              AND created_at >= NOW() - INTERVAL '6 months'
            GROUP BY date_trunc('month', created_at)
            ORDER BY date_trunc('month', created_at) ASC;
        `;

        const [summaryRes, lowStockRes, topSellingRes, monthlyRevRes] = await Promise.all([
            pool.query(summaryQuery, [storeId]),
            pool.query(lowStockQuery, [storeId]),
            pool.query(topSellingQuery, [storeId]),
            pool.query(monthlyRevenueQuery, [storeId])
        ]);

        return {
            summary: summaryRes.rows[0],
            lowStockAlerts: lowStockRes.rows,
            topProducts: topSellingRes.rows,
            monthlyRevenue: monthlyRevRes.rows 
        };

    } catch (error) {
        throw error;
    }
};