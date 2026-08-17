import { getDashboardMetrics, getStoreDashboardMetrics } from "../repositories/dashboard.repository.js";

// ==========================================
// MASTER ADMIN DASHBOARD
// ==========================================
// ==========================================
// MASTER ADMIN DASHBOARD
// ==========================================
export const getMasterDashboard = async (req, res) => {
    try {
        const userRole = req.user?.role;

        // Security Check: Block Store Admins
        if (userRole.toUpperCase() !== 'MASTER_ADMIN' && userRole.toUpperCase() !== 'MASTERADMIN') {
            return res.status(403).json({ 
                success: false, 
                message: "Unauthorized. Dashboard access is restricted to Master Admins." 
            });
        }

        const dashboardData = await getDashboardMetrics();

        // Format SQL strings to JS Numbers
        dashboardData.summary = {
            today_revenue: parseFloat(dashboardData.summary.today_revenue),
            month_revenue: parseFloat(dashboardData.summary.month_revenue),
            total_bills: parseInt(dashboardData.summary.total_bills, 10),
            total_products: parseInt(dashboardData.summary.total_products, 10),
            total_stores: parseInt(dashboardData.summary.total_stores, 10)
        };

        dashboardData.branchPerformance = dashboardData.branchPerformance.map(b => ({
            ...b,
            total_revenue: parseFloat(b.total_revenue)
        }));

        dashboardData.topProducts = dashboardData.topProducts.map(p => ({
            ...p,
            total_sold: parseInt(p.total_sold, 10)
        }));

        // ✨ NEW: Format Overall Graph Data
        if (dashboardData.monthlyRevenue) {
            dashboardData.monthlyRevenue = dashboardData.monthlyRevenue.map(m => ({
                month: m.month, // e.g., "Aug 2026"
                revenue: parseFloat(m.revenue)
            }));
        }

        return res.status(200).json({
            success: true,
            data: dashboardData
        });

    } catch (error) {
        console.error("Dashboard Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error while loading dashboard" });
    }
};

// ==========================================
// STORE ADMIN DASHBOARD
// ==========================================
export const getStoreDashboard = async (req, res) => {
    try {
        const userRole = req.user?.role;
        const storeId = req.user?.storeId;

        // Security Check: Block anyone who isn't a Store Admin
        if (!storeId || (userRole.toUpperCase() !== 'STORE_ADMIN' && userRole.toUpperCase() !== 'STOREADMIN')) {
            return res.status(403).json({ 
                success: false, 
                message: "Unauthorized. Only Store Admins can view branch dashboards." 
            });
        }

        const dashboardData = await getStoreDashboardMetrics(storeId);

        // Format SQL strings to JS Numbers
        dashboardData.summary = {
            today_revenue: parseFloat(dashboardData.summary.today_revenue),
            month_revenue: parseFloat(dashboardData.summary.month_revenue),
            total_bills: parseInt(dashboardData.summary.total_bills, 10),
            total_products: parseInt(dashboardData.summary.total_products, 10),
            total_stock_units: parseInt(dashboardData.summary.total_stock_units, 10),
            out_of_stock_count: parseInt(dashboardData.summary.out_of_stock_count, 10)
        };

        dashboardData.topProducts = dashboardData.topProducts.map(p => ({
            ...p,
            total_sold: parseInt(p.total_sold, 10)
        }));

        // Format Graph Data
        if (dashboardData.monthlyRevenue) {
            dashboardData.monthlyRevenue = dashboardData.monthlyRevenue.map(m => ({
                month: m.month, // e.g., "Aug 2026"
                revenue: parseFloat(m.revenue)
            }));
        }

        return res.status(200).json({
            success: true,
            data: dashboardData
        });

    } catch (error) {
        console.error("Store Dashboard Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error while loading store dashboard" });
    }
};
import { getStoreWiseRevenue } from '../repositories/dashboard.repository.js'; // Ensure this is imported!

// ==========================================
// MASTER ADMIN: DETAILED STORE REVENUES
// ==========================================
export const getStoreWiseRevenueData = async (req, res) => {
    try {
        const userRole = req.user?.role;

        // Security Check: Block Store Admins
        if (!userRole || (userRole.toUpperCase() !== 'MASTER_ADMIN' && userRole.toUpperCase() !== 'MASTERADMIN')) {
            return res.status(403).json({ 
                success: false, 
                message: "Unauthorized. Access is restricted to Master Admins." 
            });
        }

        const rawData = await getStoreWiseRevenue();

        // Format SQL strings to JS Numbers
        const formattedData = rawData.map(store => ({
            store_id: store.store_id,
            store_name: store.store_name,
            total_revenue: parseFloat(store.total_revenue),
            current_month_revenue: parseFloat(store.current_month_revenue),
            today_revenue: parseFloat(store.today_revenue)
        }));

        return res.status(200).json({
            success: true,
            data: formattedData
        });

    } catch (error) {
        console.error("Store Wise Revenue Error:", error);
        return res.status(500).json({ 
            success: false, 
            message: "Internal Server Error while loading store revenues" 
        });
    }
};