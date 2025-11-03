import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";

const Reports = () => {
  const location = useLocation();
  const [activeReport, setActiveReport] = useState("daily");
  const [dateRange, setDateRange] = useState("today");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState({ pdf: false, excel: false });

  // Report data state
  const [reportData, setReportData] = useState({
    daily: null,
    weekly: null,
    monthly: null,
    inventory: null,
  });

  const [salesTrend, setSalesTrend] = useState([]);

  // Quick stats for sidebar
  const [stats, setStats] = useState({
    totalProducts: { value: 0, trend: "+0%" },
    todaySales: { value: "0", trend: "+0%" },
    lowStockItems: { value: 0, trend: "-0" },
  });

  const API_BASE_URL = "http://localhost:8000/api";

  // Fetch quick stats for sidebar
  const fetchQuickStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/dashboard/stats`);

      if (!response.ok) {
        console.log("Stats endpoint not available, using fallback data");
        return;
      }

      const result = await response.json();

      if (result.success && result.data) {
        const data = result.data;
        setStats({
          totalProducts: {
            value: data.totalProducts || 0,
            trend: data.productsTrend || "+0%",
          },
          todaySales: {
            value: data.todaySales ? data.todaySales.toLocaleString() : "0",
            trend: data.salesTrend || "+0%",
          },
          lowStockItems: {
            value: data.lowStockItems || 0,
            trend: data.stockTrend || "-0",
          },
        });
      }
    } catch (err) {
      console.log("Quick stats not available, using fallback data");
    }
  };

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

  // Enhanced fetch report data from API with proper data transformation
  const fetchReportData = async (reportType) => {
    if (reportData[reportType] && !reportData[reportType]._isMock) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let endpoint = "";
      let params = new URLSearchParams();

      // Add date range parameters
      switch (dateRange) {
        case "today":
          params.append("period", "today");
          break;
        case "week":
          params.append("period", "week");
          break;
        case "month":
          params.append("period", "month");
          break;
        case "quarter":
          params.append("period", "quarter");
          break;
        default:
          params.append("period", "today");
      }

      switch (reportType) {
        case "daily":
          endpoint = "/reports/daily";
          break;
        case "weekly":
          endpoint = "/reports/weekly";
          break;
        case "monthly":
          endpoint = "/reports/monthly";
          break;
        case "inventory":
          endpoint = "/reports/inventory";
          break;
        default:
          return;
      }

      const url = `${API_BASE_URL}${endpoint}?${params.toString()}`;
      console.log("Fetching from:", url);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP ${response.status}: ${errorText || response.statusText}`
        );
      }

      const result = await response.json();
      console.log("Received API response for", reportType, ":", result);

      if (result.success && result.data) {
        const apiData = result.data;

        console.log(
          "API Data fields for",
          reportType,
          ":",
          Object.keys(apiData)
        );
        console.log("Totals object:", apiData.totals);

        // Transform the data to match our component's expected structure
        const transformedData = {
          revenue: safeValue(
            apiData.totals?.revenue ||
              apiData.totals?.total_revenue ||
              apiData.totals?.sales ||
              apiData.totals?.income
          ),
          profit: safeValue(
            apiData.totals?.profit ||
              apiData.totals?.net_profit ||
              apiData.totals?.earnings ||
              apiData.totals?.net_income
          ),
          transactions: safeValue(
            apiData.totals?.transactions ||
              apiData.totals?.total_transactions ||
              apiData.totals?.orders_count ||
              apiData.totals?.orders
          ),
          averageOrder:
            apiData.totals?.averageOrder ||
            apiData.totals?.avg_order_value ||
            apiData.totals?.average_order ||
            apiData.totals?.avg_transaction ||
            (apiData.totals?.revenue && apiData.totals?.transactions
              ? (
                  safeValue(apiData.totals.revenue) /
                  safeValue(apiData.totals.transactions)
                ).toFixed(2)
              : 0),

          topProducts: (
            apiData.topProducts ||
            apiData.top_products ||
            apiData.products ||
            apiData.best_sellers ||
            apiData.popular_items ||
            []
          ).map((product) => ({
            name: safeDisplay(
              product.name ||
                product.product_name ||
                product.productName ||
                "Unknown Product"
            ),
            sales: safeValue(
              product.sales ||
                product.units_sold ||
                product.quantity_sold ||
                product.total_sales
            ),
            revenue: safeValue(
              product.revenue ||
                product.total_revenue ||
                product.sales_revenue ||
                product.total_income
            ),
          })),

          growth: safeValue(
            apiData.totals?.growth ||
              apiData.totals?.growth_rate ||
              apiData.growth ||
              apiData.percentage_growth
          ),

          totalValue: safeValue(
            apiData.totals?.totalValue ||
              apiData.totals?.total_value ||
              apiData.totals?.inventory_value ||
              apiData.totalValue
          ),
          lowStockItems: safeValue(
            apiData.lowStockItems ||
              apiData.low_stock_count ||
              apiData.low_stock ||
              apiData.low_inventory
          ),
          outOfStock: safeValue(
            apiData.outOfStock ||
              apiData.out_of_stock_count ||
              apiData.out_of_stock ||
              apiData.zero_stock
          ),
          turnoverRate: safeValue(
            apiData.totals?.turnoverRate ||
              apiData.totals?.turnover_rate ||
              apiData.turnoverRate ||
              apiData.turnover
          ),

          _isMock: false,
        };

        console.log("Transformed data for", reportType, ":", transformedData);

        setReportData((prev) => ({
          ...prev,
          [reportType]: transformedData,
        }));

        // Update stats from report data
        if (reportType === "daily") {
          updateStatsFromReportData(transformedData);
        }

        // Handle sales trend data with different field names - SAFELY
        if (reportType === "daily") {
          const trendData =
            apiData.sales ||
            apiData.salesTrend ||
            apiData.daily_sales ||
            apiData.sales_trend ||
            apiData.trend ||
            apiData.daily_data ||
            [];
          console.log("Sales trend data:", trendData);

          const safeTrendData = trendData.map((item) => ({
            day: safeDisplay(item.day || item.date || item.label, "Day"),
            sales: safeValue(
              item.sales || item.sales_count || item.count || item.quantity
            ),
            revenue: safeValue(item.revenue || item.amount || item.total),
          }));

          setSalesTrend(safeTrendData);
        }
      } else {
        throw new Error("Invalid API response format");
      }
    } catch (err) {
      console.error(`Error fetching ${reportType} report:`, err);
      setError(err.message);

      // Set mock data as fallback
      setMockDataAsFallback(reportType);
    } finally {
      setLoading(false);
    }
  };

  // Update stats from report data
  const updateStatsFromReportData = (dailyData) => {
    setStats((prev) => ({
      ...prev,
      todaySales: {
        value: dailyData.revenue ? dailyData.revenue.toLocaleString() : "0",
        trend: "+12%",
      },
      totalProducts: {
        value: prev.totalProducts.value || 156,
        trend: "+5%",
      },
      lowStockItems: {
        value: dailyData.lowStockItems || prev.lowStockItems.value || 8,
        trend: "-2",
      },
    }));
  };

  // Mock data as fallback
  const setMockDataAsFallback = (reportType) => {
    const mockData = {
      daily: {
        revenue: 2450,
        profit: 856,
        transactions: 42,
        averageOrder: 58.33,
        topProducts: [
          { name: "Premium T-Shirt", sales: 15, revenue: 450 },
          { name: "Designer Jeans", sales: 8, revenue: 720 },
          { name: "Summer Dress", sales: 6, revenue: 390 },
          { name: "Casual Shirt", sales: 5, revenue: 275 },
        ],
        _isMock: true,
      },
      weekly: {
        revenue: 15200,
        profit: 5320,
        transactions: 210,
        averageOrder: 72.38,
        growth: 12.5,
        _isMock: true,
      },
      monthly: {
        revenue: 58400,
        profit: 20440,
        transactions: 890,
        averageOrder: 65.62,
        growth: 8.3,
        _isMock: true,
      },
      inventory: {
        totalValue: 28450,
        lowStockItems: 8,
        outOfStock: 2,
        turnoverRate: 3.2,
        _isMock: true,
      },
    };

    const mockSalesTrend = [
      { day: "Mon", sales: 45, revenue: 1200 },
      { day: "Tue", sales: 52, revenue: 1450 },
      { day: "Wed", sales: 48, revenue: 1350 },
      { day: "Thu", sales: 61, revenue: 1850 },
      { day: "Fri", sales: 55, revenue: 1650 },
      { day: "Sat", sales: 72, revenue: 2450 },
      { day: "Sun", sales: 68, revenue: 2250 },
    ];

    setReportData((prev) => ({
      ...prev,
      [reportType]: mockData[reportType],
    }));

    if (reportType === "daily") {
      setSalesTrend(mockSalesTrend);
      setStats({
        totalProducts: { value: 156, trend: "+5%" },
        todaySales: { value: "2,450", trend: "+12%" },
        lowStockItems: { value: 8, trend: "-2" },
      });
    }
  };

  // Enhanced export functions with proper backend integration
  const handleExportPDF = async () => {
    try {
      setExporting((prev) => ({ ...prev, pdf: true }));

      const response = await fetch(`${API_BASE_URL}/reports/export/pdf`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          report_type: activeReport,
          date_range: dateRange,
          data: reportData[activeReport],
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Create blob from response
      const blob = await response.blob();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      // Get filename from content-disposition header or use default
      const contentDisposition = response.headers.get("content-disposition");
      let filename = `${activeReport}-report-${
        new Date().toISOString().split("T")[0]
      }.pdf`;

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (filenameMatch) filename = filenameMatch[1];
      }

      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Error exporting PDF:", err);
      alert("Error exporting PDF. Please try again.");
    } finally {
      setExporting((prev) => ({ ...prev, pdf: false }));
    }
  };

  const handleExportExcel = async () => {
    try {
      setExporting((prev) => ({ ...prev, excel: true }));

      const response = await fetch(`${API_BASE_URL}/reports/export/excel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          report_type: activeReport,
          date_range: dateRange,
          data: reportData[activeReport],
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Create blob from response
      const blob = await response.blob();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      // Get filename from content-disposition header or use default
      const contentDisposition = response.headers.get("content-disposition");
      let filename = `${activeReport}-report-${
        new Date().toISOString().split("T")[0]
      }.xlsx`;

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (filenameMatch) filename = filenameMatch[1];
      }

      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Error exporting Excel:", err);
      alert("Error exporting Excel file. Please try again.");
    } finally {
      setExporting((prev) => ({ ...prev, excel: false }));
    }
  };

  // Print functionality
  const handlePrint = () => {
    window.print();
  };

  // Fetch data when active report changes
  useEffect(() => {
    fetchReportData(activeReport);
  }, [activeReport]);

  // Refresh data when date range changes
  useEffect(() => {
    fetchReportData(activeReport);
  }, [dateRange]);

  // Fetch quick stats on component mount
  useEffect(() => {
    fetchQuickStats();
  }, []);

  const menuItems = [
    { path: "/dashboard", name: "Dashboard", icon: "📊" },
    { path: "/products", name: "Products", icon: "👕" },
    { path: "/sales", name: "Sales", icon: "💰" },
    { path: "/reports", name: "Reports", icon: "📈" },
    { path: "/users", name: "User Management", icon: "👥" },
  ];

  const reportTypes = [
    {
      id: "daily",
      name: "Daily Report",
      description: "Today's performance overview",
    },
    {
      id: "weekly",
      name: "Weekly Report",
      description: "7-day performance analysis",
    },
    {
      id: "monthly",
      name: "Monthly Report",
      description: "30-day business insights",
    },
    {
      id: "inventory",
      name: "Inventory Report",
      description: "Stock levels and valuation",
    },
  ];

  const handleNavClick = () => {
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };

  const getProgressColor = (percentage) => {
    if (percentage >= 80) return "bg-green-500";
    if (percentage >= 60) return "bg-blue-500";
    if (percentage >= 40) return "bg-yellow-500";
    return "bg-red-500";
  };

  const renderReportContent = () => {
    const data = reportData[activeReport];

    console.log("Rendering report content for", activeReport, "Data:", data);

    if (loading) {
      return (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-gray-600">Loading report data...</span>
        </div>
      );
    }

    if (error && !data) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <div className="text-red-500 text-lg mb-2">⚠️</div>
          <h3 className="text-red-800 font-semibold mb-2">
            Error Loading Report
          </h3>
          <p className="text-red-600 text-sm mb-4">{error}</p>
          <button
            onClick={() => fetchReportData(activeReport)}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium text-sm"
          >
            Retry
          </button>
        </div>
      );
    }

    if (!data) {
      return (
        <div className="text-center py-12 text-gray-500">
          No data available for this report.
        </div>
      );
    }

    const isMockData = data._isMock;

    switch (activeReport) {
      case "daily":
        const products = data.topProducts || [];
        return (
          <div className="space-y-6">
            {isMockData && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <div className="flex items-center">
                  <span className="text-yellow-500 mr-2">⚠️</span>
                  <p className="text-yellow-800 text-sm">
                    Showing demo data. Connect to backend for real data.
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-600">
                    Total Revenue
                  </h3>
                  <span className="text-green-500 text-lg">💰</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  ${safeValue(data.revenue).toLocaleString()}
                </p>
                <p className="text-sm text-green-600">+12% from yesterday</p>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-600">
                    Net Profit
                  </h3>
                  <span className="text-blue-500 text-lg">💹</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  ${safeValue(data.profit).toLocaleString()}
                </p>
                <p className="text-sm text-blue-600">42% margin</p>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-600">
                    Transactions
                  </h3>
                  <span className="text-purple-500 text-lg">🛒</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {safeValue(data.transactions)}
                </p>
                <p className="text-sm text-gray-600">Today's orders</p>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-600">
                    Avg. Order
                  </h3>
                  <span className="text-orange-500 text-lg">📦</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  ${safeValue(data.averageOrder)}
                </p>
                <p className="text-sm text-gray-600">Per transaction</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Top Selling Products
                </h3>
                <div className="space-y-4">
                  {products.map((product, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <span className="text-blue-600 text-sm font-semibold">
                            {index + 1}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {safeDisplay(product.name)}
                          </p>
                          <p className="text-sm text-gray-500">
                            {safeValue(product.sales)} units sold
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">
                          ${safeValue(product.revenue)}
                        </p>
                        <p className="text-sm text-green-600">Revenue</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Sales Trend
                </h3>
                <div className="space-y-3">
                  {salesTrend.length > 0 ? (
                    salesTrend.map((day, index) => {
                      const salesCount = safeValue(day.sales);
                      const revenueAmount = safeValue(day.revenue);
                      const progressPercentage = Math.min(
                        (salesCount / 80) * 100,
                        100
                      );

                      return (
                        <div
                          key={index}
                          className="flex items-center justify-between"
                        >
                          <span className="text-sm font-medium text-gray-600 w-12">
                            {safeDisplay(day.day)}
                          </span>
                          <div className="flex-1 mx-4">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${getProgressColor(
                                  progressPercentage
                                )}`}
                                style={{ width: `${progressPercentage}%` }}
                              ></div>
                            </div>
                          </div>
                          <div className="text-right w-20">
                            <p className="text-sm font-semibold text-gray-900">
                              {salesCount} sales
                            </p>
                            <p className="text-xs text-gray-500">
                              ${revenueAmount}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-4 text-gray-500">
                      No sales trend data available
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      case "weekly":
        return (
          <div className="space-y-6">
            {isMockData && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <div className="flex items-center">
                  <span className="text-yellow-500 mr-2">⚠️</span>
                  <p className="text-yellow-800 text-sm">
                    Showing demo data. Connect to backend for real data.
                  </p>
                </div>
              </div>
            )}

            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-800">
                  Weekly Performance
                </h3>
                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                  +{safeValue(data.growth)}% Growth
                </span>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">
                    ${safeValue(data.revenue).toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-600">Total Revenue</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">
                    ${safeValue(data.profit).toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-600">Net Profit</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">
                    {safeValue(data.transactions)}
                  </p>
                  <p className="text-sm text-gray-600">Transactions</p>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <p className="text-2xl font-bold text-orange-600">
                    ${safeValue(data.averageOrder)}
                  </p>
                  <p className="text-sm text-gray-600">Avg. Order Value</p>
                </div>
              </div>
            </div>
          </div>
        );

      case "monthly":
        return (
          <div className="space-y-6">
            {isMockData && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <div className="flex items-center">
                  <span className="text-yellow-500 mr-2">⚠️</span>
                  <p className="text-yellow-800 text-sm">
                    Showing demo data. Connect to backend for real data.
                  </p>
                </div>
              </div>
            )}

            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Monthly Financial Summary
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="bg-blue-100 p-4 rounded-lg">
                    <p className="text-3xl font-bold text-blue-600">
                      ${safeValue(data.revenue).toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">Gross Revenue</p>
                  </div>
                </div>
                <div className="text-center">
                  <div className="bg-green-100 p-4 rounded-lg">
                    <p className="text-3xl font-bold text-green-600">
                      ${safeValue(data.profit).toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">Net Profit</p>
                  </div>
                </div>
                <div className="text-center">
                  <div className="bg-purple-100 p-4 rounded-lg">
                    <p className="text-3xl font-bold text-purple-600">
                      {safeValue(data.transactions)}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">Total Orders</p>
                  </div>
                </div>
                <div className="text-center">
                  <div className="bg-orange-100 p-4 rounded-lg">
                    <p className="text-3xl font-bold text-orange-600">
                      {safeValue(data.growth)}%
                    </p>
                    <p className="text-sm text-gray-600 mt-1">Growth Rate</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case "inventory":
        return (
          <div className="space-y-6">
            {isMockData && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <div className="flex items-center">
                  <span className="text-yellow-500 mr-2">⚠️</span>
                  <p className="text-yellow-800 text-sm">
                    Showing demo data. Connect to backend for real data.
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-600">
                    Inventory Value
                  </h3>
                  <span className="text-blue-500 text-lg">💎</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  ${safeValue(data.totalValue).toLocaleString()}
                </p>
                <p className="text-sm text-gray-600">Current stock value</p>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-600">
                    Low Stock
                  </h3>
                  <span className="text-orange-500 text-lg">⚠️</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {safeValue(data.lowStockItems)}
                </p>
                <p className="text-sm text-gray-600">Items need restock</p>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-600">
                    Out of Stock
                  </h3>
                  <span className="text-red-500 text-lg">🚫</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {safeValue(data.outOfStock)}
                </p>
                <p className="text-sm text-gray-600">Urgent attention</p>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-600">
                    Turnover Rate
                  </h3>
                  <span className="text-green-500 text-lg">🔄</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {safeValue(data.turnoverRate)}x
                </p>
                <p className="text-sm text-gray-600">Annual turnover</p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
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
                ${stats.todaySales.value}
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
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-4 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
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
                  Reports & Analytics
                </h2>
                <p className="text-xs lg:text-sm text-gray-500 hidden sm:block">
                  Comprehensive business insights
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="quarter">This Quarter</option>
              </select>
              <button
                onClick={handleExportPDF}
                disabled={exporting.pdf || !reportData[activeReport]}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {exporting.pdf ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Exporting...
                  </>
                ) : (
                  "Export PDF"
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Reports Content */}
        <main className="flex-1 overflow-auto p-4 lg:p-8">
          <div className="mb-6 lg:mb-8">
            <h1 className="text-2xl lg:text-4xl font-bold text-gray-900 mb-2">
              Business Intelligence
            </h1>
            <p className="text-gray-600 text-sm lg:text-lg">
              Advanced analytics and performance reports
            </p>
          </div>

          {/* Report Type Selector */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 lg:mb-8">
            {reportTypes.map((report) => (
              <button
                key={report.id}
                onClick={() => setActiveReport(report.id)}
                className={`p-4 lg:p-6 rounded-xl border-2 text-left transition-all duration-200 ${
                  activeReport === report.id
                    ? "border-blue-500 bg-blue-50 shadow-lg transform scale-105"
                    : "border-gray-200 bg-white hover:border-blue-300 hover:shadow-md"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3
                    className={`font-semibold text-sm lg:text-base ${
                      activeReport === report.id
                        ? "text-blue-700"
                        : "text-gray-800"
                    }`}
                  >
                    {report.name}
                  </h3>
                  <span className="text-lg">📊</span>
                </div>
                <p
                  className={`text-xs lg:text-sm ${
                    activeReport === report.id
                      ? "text-blue-600"
                      : "text-gray-600"
                  }`}
                >
                  {report.description}
                </p>
              </button>
            ))}
          </div>

          {/* Debug Panel */}
          <div className="bg-gray-100 border border-gray-300 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-800 mb-2">🔍 Debug Info</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div>
                <strong>Active Report:</strong> {activeReport}
              </div>
              <div>
                <strong>Loading:</strong> {loading ? "Yes" : "No"}
              </div>
              <div>
                <strong>Error:</strong> {error || "None"}
              </div>
              <div>
                <strong>Data Type:</strong>{" "}
                {reportData[activeReport]?._isMock ? "Mock" : "Real"}
              </div>
            </div>
            {reportData[activeReport] && (
              <div className="mt-2">
                <details>
                  <summary className="cursor-pointer font-medium text-sm">
                    View Raw Data Structure
                  </summary>
                  <pre className="text-xs bg-white p-2 rounded border mt-1 overflow-auto max-h-40">
                    {JSON.stringify(reportData[activeReport], null, 2)}
                  </pre>
                </details>
              </div>
            )}
          </div>

          {/* Report Content */}
          <div className="bg-white rounded-xl lg:rounded-2xl shadow-lg border border-gray-200 p-4 lg:p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl lg:text-2xl font-bold text-gray-800">
                {reportTypes.find((r) => r.id === activeReport)?.name}
              </h2>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <span>
                  Last updated:{" "}
                  {loading ? "Updating..." : new Date().toLocaleTimeString()}
                </span>
                {reportData[activeReport]?._isMock && (
                  <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs">
                    Demo Data
                  </span>
                )}
              </div>
            </div>

            {renderReportContent()}

            {/* Report Actions */}
            <div className="mt-8 pt-6 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
              <div className="text-sm text-gray-600">
                {reportData[activeReport]?._isMock ? (
                  <span className="text-yellow-600">
                    Connect to backend for real data
                  </span>
                ) : (
                  <span>
                    Need more detailed analysis?{" "}
                    <button className="text-blue-600 hover:text-blue-800 font-medium">
                      Contact Support
                    </button>
                  </span>
                )}
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium text-sm"
                >
                  Print Report
                </button>
                <button
                  onClick={handleExportExcel}
                  disabled={exporting.excel || !reportData[activeReport]}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {exporting.excel ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Exporting...
                    </>
                  ) : (
                    "Download Excel"
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Key Insights - Only show if we have real data */}
          {!reportData[activeReport]?._isMock && (
            <div className="mt-6 lg:mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 lg:p-6">
                <h3 className="font-semibold text-blue-800 mb-2">
                  📈 Performance Insight
                </h3>
                <p className="text-blue-700 text-sm">
                  Your weekend sales are consistently 35% higher than weekdays.
                  Consider targeted promotions.
                </p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 lg:p-6">
                <h3 className="font-semibold text-green-800 mb-2">
                  💰 Revenue Opportunity
                </h3>
                <p className="text-green-700 text-sm">
                  Premium products show 42% higher profit margins. Focus on
                  upselling these items.
                </p>
              </div>
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 lg:p-6">
                <h3 className="font-semibold text-orange-800 mb-2">
                  ⚠️ Stock Alert
                </h3>
                <p className="text-orange-700 text-sm">
                  {stats.lowStockItems.value} items are running low on stock.
                  Reorder now to avoid lost sales.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Reports;
