import { getDashboardMetrics, getStoreDashboardMetrics } from "../repositories/dashboard.repository.js";

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

        return res.status(200).json({
            success: true,
            data: dashboardData
        });

    } catch (error) {
        console.error("Dashboard Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error while loading dashboard" });
    }
};

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
            total_bills: parseInt(dashboardData.summary.total_bills, 10)
        };

        dashboardData.topProducts = dashboardData.topProducts.map(p => ({
            ...p,
            total_sold: parseInt(p.total_sold, 10)
        }));

        return res.status(200).json({
            success: true,
            data: dashboardData
        });

    } catch (error) {
        console.error("Store Dashboard Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error while loading store dashboard" });
    }
};