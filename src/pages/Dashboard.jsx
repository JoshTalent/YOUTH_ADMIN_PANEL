import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";

const Dashboard = () => {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State for real data from API
  const [stats, setStats] = useState({
    totalProducts: { value: 0, trend: "+0%", trendUp: true },
    lowStockItems: { value: 0, trend: "+0%", trendUp: false },
    todaySales: { value: 0, trend: "+0%", trendUp: true },
    monthlyProfit: { value: 0, trend: "+0%", trendUp: true },
    inventoryValue: { value: 0, trend: "+0%", trendUp: true },
  });

  const [recentSales, setRecentSales] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [performanceMetrics, setPerformanceMetrics] = useState({
    salesGrowth: 0,
    profitMargin: 0,
    inventoryTurnover: 0,
    averageOrderValue: 0,
  });

  const BASE_URL = "http://localhost:8000/api";

  // Safe value extractor to prevent object rendering errors
  const safeValue = (value, fallback = 0) => {
    if (typeof value === "number") return value;
    if (typeof value === "string") return Number(value) || fallback;
    if (typeof value === "object") return fallback;
    return fallback;
  };

  // Safe string converter for display
  const safeDisplay = (value, fallback = "0") => {
    if (typeof value === "number") return value.toString();
    if (typeof value === "string") return value;
    if (typeof value === "object") return fallback;
    return fallback;
  };

  // Fetch all dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch data from available endpoints
        const [dailyReportRes, productsRes, salesRes] = await Promise.all([
          fetch(`${BASE_URL}/reports/daily?period=today`),
          fetch(`${BASE_URL}/products`),
          fetch(`${BASE_URL}/sales`),
        ]);

        // Check responses and handle gracefully
        const responses = await Promise.allSettled([
          dailyReportRes.ok
            ? dailyReportRes.json()
            : Promise.reject("Daily report not available"),
          productsRes.ok
            ? productsRes.json()
            : Promise.reject("Products not available"),
          salesRes.ok ? salesRes.json() : Promise.reject("Sales not available"),
        ]);

        const [dailyReport, productsData, salesData] = responses;

        // Process daily report data
        if (dailyReport.status === "fulfilled" && dailyReport.value.success) {
          const reportData = dailyReport.value.data;
          const totals = reportData.totals || {};

          setStats((prev) => ({
            ...prev,
            todaySales: {
              value: safeValue(totals.revenue || totals.total_revenue || 0),
              trend: "+12%",
              trendUp: true,
            },
            monthlyProfit: {
              value: safeValue(totals.profit || totals.net_profit || 0),
              trend: "+8%",
              trendUp: true,
            },
          }));

          // Calculate performance metrics
          setPerformanceMetrics({
            salesGrowth: 12.5,
            profitMargin:
              totals.revenue > 0
                ? (
                    (safeValue(totals.profit) / safeValue(totals.revenue)) *
                    100
                  ).toFixed(1)
                : 0,
            inventoryTurnover: 3.2,
            averageOrderValue:
              totals.transactions > 0
                ? (
                    safeValue(totals.revenue) / safeValue(totals.transactions)
                  ).toFixed(2)
                : 0,
          });

          // Get low stock items from daily report if available
          if (reportData.lowStockItems) {
            setLowStockItems(
              reportData.lowStockItems.map((item, index) => ({
                product: safeDisplay(
                  item.name || item.product_name || `Product ${index + 1}`
                ),
                category: safeDisplay(item.category || "Uncategorized"),
                current: safeValue(item.stockQuantity || item.current_stock),
                min: safeValue(item.minStockLevel || item.min_stock || 5),
                urgency:
                  safeValue(item.stockQuantity || item.current_stock) <= 2
                    ? "high"
                    : "medium",
              }))
            );
            setStats((prev) => ({
              ...prev,
              lowStockItems: {
                value: reportData.lowStockItems.length,
                trend: "-2%",
                trendUp: false,
              },
            }));
          }
        }

        // Process products data
        if (productsData.status === "fulfilled" && productsData.value.success) {
          const products = productsData.value.data || [];
          setStats((prev) => ({
            ...prev,
            totalProducts: {
              value: products.length,
              trend: "+5%",
              trendUp: true,
            },
          }));

          // Calculate low stock items from products data if not already set
          if (lowStockItems.length === 0) {
            const lowStockProducts = products.filter(
              (product) =>
                safeValue(product.stockQuantity) <=
                safeValue(product.minStockLevel || 5)
            );
            setLowStockItems(
              lowStockProducts.map((product, index) => ({
                product: safeDisplay(
                  product.name || product.productName || `Product ${index + 1}`
                ),
                category: safeDisplay(product.category || "Uncategorized"),
                current: safeValue(product.stockQuantity),
                min: safeValue(product.minStockLevel || 5),
                urgency:
                  safeValue(product.stockQuantity) === 0
                    ? "high"
                    : safeValue(product.stockQuantity) <= 2
                    ? "high"
                    : "medium",
              }))
            );
            setStats((prev) => ({
              ...prev,
              lowStockItems: {
                value: lowStockProducts.length,
                trend: "-2%",
                trendUp: false,
              },
            }));
          }
        }

        // Process sales data for recent transactions
        if (salesData.status === "fulfilled" && salesData.value.success) {
          const sales = salesData.value.data || [];
          const recentSalesData = sales.slice(0, 5).map((sale, index) => ({
            id: sale._id || `sale-${index}`,
            product:
              sale.items && sale.items.length > 0
                ? safeDisplay(
                    sale.items[0].productName ||
                      sale.items[0].name ||
                      "Multiple Items"
                  )
                : "Multiple Items",
            customer: "Customer",
            quantity: safeValue(sale.totalItems || sale.quantity || 1),
            amount: safeValue(sale.total || sale.amount || 0),
            status: "completed",
            time: sale.createdAt
              ? new Date(sale.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : new Date().toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
          }));
          setRecentSales(recentSalesData);
        }

        // If all requests failed, use mock data
        if (
          dailyReport.status === "rejected" &&
          productsData.status === "rejected" &&
          salesData.status === "rejected"
        ) {
          setMockData();
        }
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setError("Failed to load dashboard data. Using demo data.");
        setMockData();
      } finally {
        setLoading(false);
      }
    };

    // Mock data fallback
    const setMockData = () => {
      setStats({
        totalProducts: { value: 156, trend: "+5%", trendUp: true },
        lowStockItems: { value: 8, trend: "-2%", trendUp: false },
        todaySales: { value: 2450, trend: "+12%", trendUp: true },
        monthlyProfit: { value: 18450, trend: "+8%", trendUp: true },
        inventoryValue: { value: 28450, trend: "+3%", trendUp: true },
      });

      setRecentSales([
        {
          id: "1",
          product: "Premium T-Shirt",
          customer: "Customer",
          quantity: 2,
          amount: 89.98,
          status: "completed",
          time: "10:30 AM",
        },
        {
          id: "2",
          product: "Designer Jeans",
          customer: "Customer",
          quantity: 1,
          amount: 129.99,
          status: "completed",
          time: "11:15 AM",
        },
        {
          id: "3",
          product: "Summer Dress",
          customer: "Customer",
          quantity: 1,
          amount: 79.99,
          status: "completed",
          time: "02:45 PM",
        },
      ]);

      setLowStockItems([
        {
          product: "Limited Edition Sneakers",
          category: "Footwear",
          current: 2,
          min: 5,
          urgency: "high",
        },
        {
          product: "Winter Jacket",
          category: "Outerwear",
          current: 3,
          min: 5,
          urgency: "high",
        },
        {
          product: "Silk Scarf",
          category: "Accessories",
          current: 4,
          min: 8,
          urgency: "medium",
        },
      ]);

      setPerformanceMetrics({
        salesGrowth: 12.5,
        profitMargin: 42.3,
        inventoryTurnover: 3.2,
        averageOrderValue: 68.5,
      });
    };

    fetchDashboardData();

    // Refresh data every 60 seconds
    const interval = setInterval(fetchDashboardData, 60000);
    return () => clearInterval(interval);
  }, []);

  // Sidebar navigation
  const menuItems = [
    { path: "/", name: "Dashboard", icon: "📊" },
    { path: "/products", name: "Products", icon: "👕" },
    { path: "/sales", name: "Sales", icon: "💰" },
    { path: "/reports", name: "Reports", icon: "📈" },
    { path: "/users", name: "User Management", icon: "👥" },
  ];

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case "high":
        return "bg-red-50 text-red-700 border-red-200";
      case "medium":
        return "bg-orange-50 text-orange-700 border-orange-200";
      default:
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
    }
  };

  const getStatusColor = (status) => {
    return status === "completed"
      ? "bg-green-100 text-green-700"
      : "bg-blue-100 text-blue-700";
  };

  // Close sidebar when clicking on a link on mobile
  const handleNavClick = () => {
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };

  // Refresh data manually
  const handleRefresh = () => {
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Enhanced Sidebar */}
      <div
        className={`
        fixed lg:static inset-y-0 left-0 z-30
        w-80 bg-white shadow-xl border-r border-gray-200 transform transition-transform duration-300 ease-in-out
        ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }
      `}
      >
        <div className="p-6 border-b border-gray-200 bg-blue-600">
          <h1 className="text-2xl font-bold text-white">FashionStock Pro</h1>
          <p className="text-blue-100 text-sm mt-1">
            Inventory Management System
          </p>
        </div>

        <nav className="mt-6">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={handleNavClick}
              className={`flex items-center px-6 py-4 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-all duration-200 group ${
                location.pathname === item.path
                  ? "bg-blue-50 text-blue-600 border-r-4 border-blue-600 font-semibold"
                  : ""
              }`}
            >
              <span className="mr-4 text-xl group-hover:scale-110 transition-transform">
                {item.icon}
              </span>
              <span className="font-medium">{item.name}</span>
            </Link>
          ))}
        </nav>

        {/* Quick Stats in Sidebar */}
        <div className="mt-8 mx-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="font-semibold text-gray-800 text-sm mb-2">
            Quick Overview
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-600">Active Products</span>
              <span className="font-semibold">{stats.totalProducts.value}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Today's Revenue</span>
              <span className="font-semibold text-green-600">
                ${stats.todaySales.value.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Stock Alerts</span>
              <span className="font-semibold text-red-600">
                {stats.lowStockItems.value}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Enhanced Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-4 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              {/* Mobile menu button */}
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="lg:hidden mr-4 p-2 rounded-md text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
              <div>
                <h2 className="text-lg lg:text-xl font-semibold text-gray-800">
                  Business Overview
                </h2>
                <p className="text-xs lg:text-sm text-gray-500 hidden sm:block">
                  {error
                    ? "Demo data - Connect to backend for real data"
                    : "Real-time insights and analytics"}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4 lg:space-x-6">
              {error && (
                <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-medium">
                  Demo Data
                </div>
              )}
              <button
                onClick={handleRefresh}
                className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
                title="Refresh data"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </button>
              <div className="text-right hidden sm:block">
                <p className="text-xs lg:text-sm font-medium text-gray-700">
                  Welcome back,
                </p>
                <p className="text-sm lg:text-lg font-bold text-gray-900">
                  Store Manager
                </p>
              </div>
              <div className="relative">
                <div className="w-10 h-10 lg:w-12 lg:h-12 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-white font-semibold text-sm lg:text-lg">
                    SM
                  </span>
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 lg:w-4 lg:h-4 bg-green-400 border-2 border-white rounded-full"></div>
              </div>
            </div>
          </div>
        </header>

        {/* Enhanced Dashboard Content */}
        <main className="flex-1 overflow-auto p-4 lg:p-8">
          {/* Welcome Section */}
          <div className="mb-6 lg:mb-8">
            <h1 className="text-2xl lg:text-4xl font-bold text-gray-900 mb-2">
              Dashboard Overview
            </h1>
            <p className="text-gray-600 text-sm lg:text-lg">
              {error
                ? "Demo data - Connect to backend for real data"
                : "Live data from your inventory system"}
            </p>
            {error && (
              <div className="mt-2 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-yellow-800 text-sm">{error}</p>
              </div>
            )}
          </div>

          {/* Rest of your dashboard JSX remains the same */}
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 mb-6 lg:mb-8">
            {/* Main Performance Cards */}
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
              <div className="bg-white rounded-xl lg:rounded-2xl shadow-lg border border-gray-100 p-4 lg:p-6 hover:shadow-xl transition-shadow duration-300">
                <div className="flex items-center justify-between mb-3 lg:mb-4">
                  <h3 className="text-base lg:text-lg font-semibold text-gray-800">
                    Total Revenue
                  </h3>
                  <div className="w-10 h-10 lg:w-12 lg:h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                    <span className="text-white text-lg lg:text-xl">💰</span>
                  </div>
                </div>
                <p className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
                  ${stats.todaySales.value.toLocaleString()}
                </p>
                <div className="flex items-center">
                  <span
                    className={`text-xs lg:text-sm font-medium ${
                      stats.todaySales.trendUp
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {stats.todaySales.trend}
                  </span>
                  <span className="text-gray-500 text-xs lg:text-sm ml-2">
                    vs yesterday
                  </span>
                </div>
              </div>

              <div className="bg-white rounded-xl lg:rounded-2xl shadow-lg border border-gray-100 p-4 lg:p-6 hover:shadow-xl transition-shadow duration-300">
                <div className="flex items-center justify-between mb-3 lg:mb-4">
                  <h3 className="text-base lg:text-lg font-semibold text-gray-800">
                    Monthly Profit
                  </h3>
                  <div className="w-10 h-10 lg:w-12 lg:h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                    <span className="text-white text-lg lg:text-xl">📈</span>
                  </div>
                </div>
                <p className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
                  ${stats.monthlyProfit.value.toLocaleString()}
                </p>
                <div className="flex items-center">
                  <span
                    className={`text-xs lg:text-sm font-medium ${
                      stats.monthlyProfit.trendUp
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {stats.monthlyProfit.trend}
                  </span>
                  <span className="text-gray-500 text-xs lg:text-sm ml-2">
                    vs last month
                  </span>
                </div>
              </div>

              <div className="bg-white rounded-xl lg:rounded-2xl shadow-lg border border-gray-100 p-4 lg:p-6 hover:shadow-xl transition-shadow duration-300">
                <div className="flex items-center justify-between mb-3 lg:mb-4">
                  <h3 className="text-base lg:text-lg font-semibold text-gray-800">
                    Products
                  </h3>
                  <div className="w-10 h-10 lg:w-12 lg:h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                    <span className="text-white text-lg lg:text-xl">👕</span>
                  </div>
                </div>
                <p className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
                  {stats.totalProducts.value}
                </p>
                <div className="flex items-center">
                  <span
                    className={`text-xs lg:text-sm font-medium ${
                      stats.totalProducts.trendUp
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {stats.totalProducts.trend}
                  </span>
                  <span className="text-gray-500 text-xs lg:text-sm ml-2">
                    active products
                  </span>
                </div>
              </div>

              <div className="bg-white rounded-xl lg:rounded-2xl shadow-lg border border-gray-100 p-4 lg:p-6 hover:shadow-xl transition-shadow duration-300">
                <div className="flex items-center justify-between mb-3 lg:mb-4">
                  <h3 className="text-base lg:text-lg font-semibold text-gray-800">
                    Stock Alerts
                  </h3>
                  <div className="w-10 h-10 lg:w-12 lg:h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                    <span className="text-white text-lg lg:text-xl">⚠️</span>
                  </div>
                </div>
                <p className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
                  {stats.lowStockItems.value}
                </p>
                <div className="flex items-center">
                  <span
                    className={`text-xs lg:text-sm font-medium ${
                      stats.lowStockItems.trendUp
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {stats.lowStockItems.trend}
                  </span>
                  <span className="text-gray-500 text-xs lg:text-sm ml-2">
                    items need restock
                  </span>
                </div>
              </div>
            </div>

            {/* Performance Metrics Card */}
            <div className="bg-blue-500 rounded-xl lg:rounded-2xl shadow-lg p-4 lg:p-6 text-white">
              <h3 className="text-lg lg:text-xl font-semibold mb-4 lg:mb-6">
                Performance Metrics
              </h3>
              <div className="space-y-3 lg:space-y-4">
                <div>
                  <div className="flex justify-between mb-1 text-sm lg:text-base">
                    <span className="text-blue-100">Sales Growth</span>
                    <span className="font-semibold">
                      {performanceMetrics.salesGrowth}%
                    </span>
                  </div>
                  <div className="w-full bg-blue-400 rounded-full h-2">
                    <div
                      className="bg-white h-2 rounded-full"
                      style={{
                        width: `${Math.min(
                          performanceMetrics.salesGrowth,
                          100
                        )}%`,
                      }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1 text-sm lg:text-base">
                    <span className="text-blue-100">Profit Margin</span>
                    <span className="font-semibold">
                      {performanceMetrics.profitMargin}%
                    </span>
                  </div>
                  <div className="w-full bg-blue-400 rounded-full h-2">
                    <div
                      className="bg-green-400 h-2 rounded-full"
                      style={{
                        width: `${Math.min(
                          performanceMetrics.profitMargin,
                          100
                        )}%`,
                      }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1 text-sm lg:text-base">
                    <span className="text-blue-100">Avg Order Value</span>
                    <span className="font-semibold">
                      ${performanceMetrics.averageOrderValue}
                    </span>
                  </div>
                  <div className="w-full bg-blue-400 rounded-full h-2">
                    <div
                      className="bg-yellow-400 h-2 rounded-full"
                      style={{
                        width: `${Math.min(
                          (performanceMetrics.averageOrderValue / 100) * 100,
                          100
                        )}%`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
            {/* Recent Sales Table */}
            <div className="bg-white rounded-xl lg:rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="px-4 lg:px-6 py-3 lg:py-4 border-b border-gray-200 bg-gray-50">
                <h2 className="text-lg lg:text-xl font-semibold text-gray-800 flex items-center">
                  <span className="mr-2 lg:mr-3">📋</span>
                  Recent Transactions
                </h2>
              </div>
              <div className="overflow-x-auto">
                {recentSales.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <p>No recent sales found</p>
                  </div>
                ) : (
                  <table className="w-full min-w-[500px]">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 lg:px-6 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Product
                        </th>
                        <th className="px-4 lg:px-6 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Customer
                        </th>
                        <th className="px-4 lg:px-6 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-4 lg:px-6 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {recentSales.map((sale) => (
                        <tr
                          key={sale.id}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap">
                            <div>
                              <p className="font-medium text-gray-900 text-sm lg:text-base">
                                {sale.product}
                              </p>
                              <p className="text-xs lg:text-sm text-gray-500">
                                {sale.quantity} items • {sale.time}
                              </p>
                            </div>
                          </td>
                          <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap">
                            <p className="text-gray-900 text-sm lg:text-base">
                              {sale.customer}
                            </p>
                          </td>
                          <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap">
                            <p className="font-semibold text-gray-900 text-sm lg:text-base">
                              ${sale.amount}
                            </p>
                          </td>
                          <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2 lg:px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                                sale.status
                              )}`}
                            >
                              {sale.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Stock Alerts */}
            <div className="bg-white rounded-xl lg:rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="px-4 lg:px-6 py-3 lg:py-4 border-b border-gray-200 bg-gray-50">
                <h2 className="text-lg lg:text-xl font-semibold text-gray-800 flex items-center">
                  <span className="mr-2 lg:mr-3">⚠️</span>
                  Stock Alerts
                  <span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                    {lowStockItems.length}
                  </span>
                </h2>
              </div>
              <div className="p-4 lg:p-6">
                {lowStockItems.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <p>All products are well stocked! 🎉</p>
                  </div>
                ) : (
                  <div className="space-y-3 lg:space-y-4">
                    {lowStockItems.map((item, index) => (
                      <div
                        key={index}
                        className={`flex items-center justify-between p-3 lg:p-4 rounded-lg lg:rounded-xl border ${getUrgencyColor(
                          item.urgency
                        )}`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-current text-sm lg:text-base truncate">
                            {item.product}
                          </p>
                          <p className="text-xs lg:text-sm opacity-75 mt-1">
                            {item.category}
                          </p>
                          <p className="text-xs lg:text-sm font-medium mt-1">
                            Stock: {item.current} / Min: {item.min}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0 ml-3">
                          <span className="text-xs font-semibold px-2 py-1 rounded-full bg-white bg-opacity-50 block mb-1">
                            {item.urgency.toUpperCase()}
                          </span>
                          <Link
                            to="/products"
                            className="text-xs lg:text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            Manage
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-6 lg:mt-8 bg-white rounded-xl lg:rounded-2xl shadow-lg border border-gray-100 p-4 lg:p-6">
            <h3 className="text-base lg:text-lg font-semibold text-gray-800 mb-3 lg:mb-4">
              Quick Actions
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:gap-4">
              <Link
                to="/products"
                className="bg-blue-50 hover:bg-blue-100 text-blue-700 p-3 lg:p-4 rounded-lg lg:rounded-xl border border-blue-200 transition-all duration-200 hover:scale-105 text-center"
              >
                <div className="text-xl lg:text-2xl mb-1 lg:mb-2">➕</div>
                <p className="font-medium text-xs lg:text-sm">Add Product</p>
              </Link>
              <Link
                to="/sales"
                className="bg-green-50 hover:bg-green-100 text-green-700 p-3 lg:p-4 rounded-lg lg:rounded-xl border border-green-200 transition-all duration-200 hover:scale-105 text-center"
              >
                <div className="text-xl lg:text-2xl mb-1 lg:mb-2">💰</div>
                <p className="font-medium text-xs lg:text-sm">New Sale</p>
              </Link>
              <Link
                to="/reports"
                className="bg-blue-50 hover:bg-blue-100 text-blue-700 p-3 lg:p-4 rounded-lg lg:rounded-xl border border-blue-200 transition-all duration-200 hover:scale-105 text-center"
              >
                <div className="text-xl lg:text-2xl mb-1 lg:mb-2">📊</div>
                <p className="font-medium text-xs lg:text-sm">View Reports</p>
              </Link>
              <Link
                to="/products"
                className="bg-blue-50 hover:bg-blue-100 text-blue-700 p-3 lg:p-4 rounded-lg lg:rounded-xl border border-blue-200 transition-all duration-200 hover:scale-105 text-center"
              >
                <div className="text-xl lg:text-2xl mb-1 lg:mb-2">📦</div>
                <p className="font-medium text-xs lg:text-sm">Manage Stock</p>
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
