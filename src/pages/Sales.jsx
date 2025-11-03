import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import axios from "axios";

const Sales = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("new-sale");
  const [products, setProducts] = useState([]);
  const [saleItems, setSaleItems] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [salesHistory, setSalesHistory] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [discount, setDiscount] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Export states
  const [exportRange, setExportRange] = useState('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  const API_BASE_URL = "http://localhost:8000/api";

  // Quick stats for sidebar
  const [stats, setStats] = useState({
    totalProducts: { value: 156, trend: "+5%" },
    todaySales: { value: "2,450", trend: "+12%" },
    lowStockItems: { value: 8, trend: "-2" },
  });

  // Fetch products from backend
  useEffect(() => {
    fetchProducts();
    fetchSalesHistory();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/products`);
      if (response.data.success) {
        setProducts(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
      alert("Failed to load products");
    }
  };

  const fetchSalesHistory = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/sales`);
      if (response.data.success) {
        setSalesHistory(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching sales history:", error);
    }
  };

  // Calculate totals
  const subtotal = saleItems.reduce((sum, item) => sum + item.total, 0);
  const discountAmount = (subtotal * discount) / 100;
  const total = subtotal - discountAmount;
  const totalProfit = saleItems.reduce((sum, item) => sum + item.profit, 0);
  const totalItems = saleItems.reduce((sum, item) => sum + item.quantity, 0);

  const addItemToSale = () => {
    if (!selectedProduct || quantity < 1) return;

    const product = products.find((p) => p._id === selectedProduct);
    if (!product) return;

    // Check stock availability
    if (product.stockQuantity < quantity) {
      alert(`Only ${product.stockQuantity} items available in stock`);
      return;
    }

    const existingItemIndex = saleItems.findIndex(
      (item) => item.productId === product._id
    );

    if (existingItemIndex >= 0) {
      const updatedItems = [...saleItems];
      const newQuantity = updatedItems[existingItemIndex].quantity + quantity;

      if (product.stockQuantity < newQuantity) {
        alert(`Only ${product.stockQuantity} items available in stock`);
        return;
      }

      updatedItems[existingItemIndex].quantity = newQuantity;
      updatedItems[existingItemIndex].total = newQuantity * product.price;
      updatedItems[existingItemIndex].profit =
        newQuantity * (product.price - product.costPrice);
      setSaleItems(updatedItems);
    } else {
      const newItem = {
        productId: product._id,
        name: product.name,
        size: product.size,
        color: product.color,
        price: product.price,
        costPrice: product.costPrice,
        quantity: quantity,
        total: quantity * product.price,
        profit: quantity * (product.price - product.costPrice),
        stock: product.stockQuantity,
      };
      setSaleItems([...saleItems, newItem]);
    }

    setSelectedProduct("");
    setQuantity(1);
  };

  const removeItem = (productId) => {
    setSaleItems(saleItems.filter((item) => item.productId !== productId));
  };

  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity < 1) return;

    const product = products.find((p) => p._id === productId);
    if (product && product.stockQuantity < newQuantity) {
      alert(`Only ${product.stockQuantity} items available in stock`);
      return;
    }

    const updatedItems = saleItems.map((item) => {
      if (item.productId === productId) {
        return {
          ...item,
          quantity: newQuantity,
          total: newQuantity * item.price,
          profit: newQuantity * (item.price - item.costPrice),
        };
      }
      return item;
    });
    setSaleItems(updatedItems);
  };

  const completeSale = async () => {
    if (saleItems.length === 0) {
      alert("Please add items to the sale");
      return;
    }

    setLoading(true);
    try {
      const saleData = {
        items: saleItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
        discount: discount,
        paymentMethod: paymentMethod,
      };

      const response = await axios.post(`${API_BASE_URL}/sales`, saleData);

      if (response.data.success) {
        alert("Sale completed successfully!");

        // Reset form
        setSaleItems([]);
        setDiscount(0);
        setPaymentMethod("cash");

        // Refresh products and sales history
        fetchProducts();
        fetchSalesHistory();
      } else {
        alert("Failed to complete sale: " + response.data.message);
      }
    } catch (error) {
      console.error("Error completing sale:", error);
      alert(
        "Failed to complete sale: " +
          (error.response?.data?.message || error.message)
      );
    } finally {
      setLoading(false);
    }
  };

  const clearSale = () => {
    setSaleItems([]);
    setDiscount(0);
    setPaymentMethod("cash");
  };

  // Export handler function
  const handleExport = async (format) => {
    if (exportRange === 'custom' && (!customStartDate || !customEndDate)) {
      alert('Please select both start and end dates for custom range');
      return;
    }

    setIsExporting(true);
    try {
      // Build query parameters
      const params = new URLSearchParams({
        exportType: exportRange
      });

      if (exportRange === 'custom') {
        params.append('startDate', customStartDate);
        params.append('endDate', customEndDate);
      }

      const url = `${API_BASE_URL}/reports/sales/export/${format}?${params.toString()}`;

      // Create a temporary anchor element to trigger download
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'true');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setShowExportModal(false);
      
      // Reset custom dates
      setCustomStartDate('');
      setCustomEndDate('');
      
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const filteredSales = salesHistory.filter((sale) => {
    const matchesSearch =
      sale.saleNumber?.toString().includes(searchTerm) ||
      sale._id?.toString().includes(searchTerm);
    const matchesDate =
      !dateFilter ||
      new Date(sale.createdAt).toISOString().split("T")[0] === dateFilter;
    return matchesSearch && matchesDate;
  });

  const menuItems = [
    { path: "/dashboard", name: "Dashboard", icon: "📊" },
    { path: "/products", name: "Products", icon: "👕" },
    { path: "/sales", name: "Sales", icon: "💰" },
    { path: "/reports", name: "Reports", icon: "📈" },
    { path: "/users", name: "User Management", icon: "👥" },
  ];

  const handleNavClick = () => {
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
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
                  Sales Management
                </h2>
                <p className="text-xs lg:text-sm text-gray-500 hidden sm:block">
                  Process transactions and track sales
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700 text-sm hidden sm:block">
                Stock Owner
              </span>
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-semibold">SO</span>
              </div>
            </div>
          </div>
        </header>

        {/* Sales Content */}
        <main className="flex-1 overflow-auto p-4 lg:p-8">
          <div className="max-w-full mx-auto">
            {/* Tab Navigation */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 mb-6 lg:mb-8 overflow-hidden">
              <div className="flex border-b border-gray-200">
                <button
                  onClick={() => setActiveTab("new-sale")}
                  className={`flex-1 px-4 lg:px-8 py-4 lg:py-6 font-bold text-sm lg:text-base border-b-2 transition-all duration-300 ${
                    activeTab === "new-sale"
                      ? "border-blue-600 text-blue-600 bg-blue-50"
                      : "border-transparent text-gray-500 hover:text-blue-600 hover:bg-blue-25"
                  }`}
                >
                  <div className="flex items-center justify-center space-x-2 lg:space-x-3">
                    <span className="text-lg lg:text-xl">🛒</span>
                    <span className="hidden xs:inline">New Sale</span>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab("history")}
                  className={`flex-1 px-4 lg:px-8 py-4 lg:py-6 font-bold text-sm lg:text-base border-b-2 transition-all duration-300 ${
                    activeTab === "history"
                      ? "border-blue-600 text-blue-600 bg-blue-50"
                      : "border-transparent text-gray-500 hover:text-blue-600 hover:bg-blue-25"
                  }`}
                >
                  <div className="flex items-center justify-center space-x-2 lg:space-x-3">
                    <span className="text-lg lg:text-xl">📋</span>
                    <span className="hidden xs:inline">Sales History</span>
                  </div>
                </button>
              </div>

              {/* Tab Content */}
              <div className="p-4 lg:p-8">
                {activeTab === "new-sale" && (
                  <div className="space-y-6 lg:grid lg:grid-cols-1 xl:grid-cols-3 lg:gap-8">
                    {/* Left Column - Product Selection */}
                    <div className="xl:col-span-2 space-y-6">
                      {/* Quick Product Grid */}
                      <div className="bg-white rounded-xl border border-gray-200 p-4 lg:p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">
                          Quick Product Selection
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 lg:gap-3 mb-4 lg:mb-6">
                          {products.slice(0, 6).map((product) => (
                            <button
                              key={product._id}
                              onClick={() => {
                                setSelectedProduct(product._id);
                                addItemToSale();
                              }}
                              disabled={product.stockQuantity === 0}
                              className="p-3 lg:p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <div className="text-left">
                                <p className="font-semibold text-xs lg:text-sm text-gray-900 truncate">
                                  {product.name}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {product.color} • {product.size}
                                </p>
                                <p className="text-sm font-bold text-blue-600 mt-2">
                                  ${product.price}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                  Stock: {product.stockQuantity}
                                </p>
                              </div>
                            </button>
                          ))}
                        </div>

                        {/* Manual Product Selection */}
                        <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                          <h4 className="font-semibold text-blue-900 mb-3">
                            Manual Product Entry
                          </h4>
                          <div className="space-y-4 lg:grid lg:grid-cols-1 md:grid-cols-2 lg:gap-4">
                            <div>
                              <label className="block text-sm font-medium text-blue-700 mb-2">
                                Select Product
                              </label>
                              <select
                                value={selectedProduct}
                                onChange={(e) =>
                                  setSelectedProduct(e.target.value)
                                }
                                className="w-full px-3 lg:px-4 py-2 lg:py-3 border border-blue-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm lg:text-base"
                              >
                                <option value="">Choose a product...</option>
                                {products.map((product) => (
                                  <option
                                    key={product._id}
                                    value={product._id}
                                    disabled={product.stockQuantity === 0}
                                  >
                                    {product.name} - ${product.price}{" "}
                                    {product.stockQuantity === 0
                                      ? "- Out of Stock"
                                      : ""}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-blue-700 mb-2">
                                Quantity
                              </label>
                              <div className="flex items-center space-x-2 lg:space-x-3">
                                <button
                                  onClick={() =>
                                    setQuantity(Math.max(1, quantity - 1))
                                  }
                                  className="w-8 h-8 lg:w-12 lg:h-12 flex items-center justify-center border border-blue-300 rounded-xl hover:bg-blue-100 text-blue-600 font-bold text-sm lg:text-lg"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  min="1"
                                  value={quantity}
                                  onChange={(e) =>
                                    setQuantity(parseInt(e.target.value) || 1)
                                  }
                                  className="w-16 lg:w-20 px-2 lg:px-3 py-2 lg:py-3 border border-blue-300 rounded-xl text-center font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm lg:text-base"
                                />
                                <button
                                  onClick={() => setQuantity(quantity + 1)}
                                  className="w-8 h-8 lg:w-12 lg:h-12 flex items-center justify-center border border-blue-300 rounded-xl hover:bg-blue-100 text-blue-600 font-bold text-sm lg:text-lg"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={addItemToSale}
                            disabled={!selectedProduct}
                            className="w-full mt-4 bg-blue-600 text-white py-3 lg:py-4 rounded-xl hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-bold text-sm lg:text-lg transition-all duration-200 shadow-md hover:shadow-lg"
                          >
                            ➕ Add to Cart
                          </button>
                        </div>
                      </div>

                      {/* Current Sale Items */}
                      <div className="bg-white rounded-xl border border-gray-200 p-4 lg:p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">
                          Current Sale Items
                        </h3>
                        <div className="space-y-3 max-h-60 lg:max-h-80 overflow-y-auto">
                          {saleItems.length === 0 ? (
                            <div className="text-center py-8">
                              <div className="text-4xl mb-4">🛒</div>
                              <p className="text-gray-500 font-medium">
                                No items in cart
                              </p>
                              <p className="text-gray-400 text-sm">
                                Add products to start a sale
                              </p>
                            </div>
                          ) : (
                            saleItems.map((item) => (
                              <div
                                key={item.productId}
                                className="flex justify-between items-center p-3 lg:p-4 bg-blue-50 rounded-xl border border-blue-200"
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="font-bold text-gray-900 truncate">
                                    {item.name}
                                  </p>
                                  <p className="text-sm text-blue-600 truncate">
                                    {item.color} • {item.size}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    Stock: {item.stock}
                                  </p>
                                </div>
                                <div className="flex items-center space-x-2 lg:space-x-4 ml-2">
                                  <div className="flex items-center space-x-1 lg:space-x-3 bg-white rounded-lg border border-blue-300 p-1">
                                    <button
                                      onClick={() =>
                                        updateQuantity(
                                          item.productId,
                                          item.quantity - 1
                                        )
                                      }
                                      className="w-6 h-6 lg:w-8 lg:h-8 flex items-center justify-center rounded-lg hover:bg-blue-100 text-blue-600 font-bold text-xs lg:text-sm"
                                    >
                                      -
                                    </button>
                                    <span className="font-bold w-6 lg:w-8 text-center text-gray-900 text-sm lg:text-base">
                                      {item.quantity}
                                    </span>
                                    <button
                                      onClick={() =>
                                        updateQuantity(
                                          item.productId,
                                          item.quantity + 1
                                        )
                                      }
                                      className="w-6 h-6 lg:w-8 lg:h-8 flex items-center justify-center rounded-lg hover:bg-blue-100 text-blue-600 font-bold text-xs lg:text-sm"
                                    >
                                      +
                                    </button>
                                  </div>
                                  <span className="font-bold text-sm lg:text-lg text-gray-900 w-12 lg:w-20 text-right">
                                    ${item.total.toFixed(2)}
                                  </span>
                                  <button
                                    onClick={() => removeItem(item.productId)}
                                    className="w-8 h-8 lg:w-10 lg:h-10 flex items-center justify-center bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors text-sm lg:text-base"
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Column - Sale Summary */}
                    <div className="space-y-6">
                      {/* Sale Summary Card */}
                      <div className="bg-white rounded-xl border border-gray-200 p-4 lg:p-6 shadow-sm">
                        <h3 className="text-lg font-bold text-gray-900 mb-4 lg:mb-6 border-b border-gray-200 pb-4">
                          Sale Summary
                        </h3>

                        {/* Order Details */}
                        <div className="space-y-3 lg:space-y-4 mb-4 lg:mb-6">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-600">
                              Items Total
                            </span>
                            <span className="font-semibold text-gray-900">
                              ${subtotal.toFixed(2)}
                            </span>
                          </div>

                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-600">
                              Discount
                            </span>
                            <div className="flex items-center space-x-2">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={discount}
                                onChange={(e) =>
                                  setDiscount(parseFloat(e.target.value) || 0)
                                }
                                className="w-12 lg:w-16 px-1 lg:px-2 py-1 border border-gray-300 rounded text-center text-sm"
                                placeholder="0"
                              />
                              <span className="text-sm text-gray-500">%</span>
                              <span className="font-semibold text-red-600 text-sm lg:text-base">
                                -${discountAmount.toFixed(2)}
                              </span>
                            </div>
                          </div>

                          <div className="border-t border-gray-200 pt-3 lg:pt-4">
                            <div className="flex justify-between items-center">
                              <span className="text-base lg:text-lg font-bold text-gray-900">
                                Total Amount
                              </span>
                              <span className="text-xl lg:text-2xl font-bold text-blue-600">
                                ${total.toFixed(2)}
                              </span>
                            </div>
                          </div>

                          <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                            <div className="flex justify-between items-center text-sm">
                              <span className="font-medium text-green-800">
                                Estimated Profit
                              </span>
                              <span className="font-bold text-green-600">
                                ${totalProfit.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Payment Method */}
                        <div className="mb-4 lg:mb-6">
                          <label className="block text-sm font-bold text-gray-700 mb-2 lg:mb-3">
                            Payment Method
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            {["cash", "card", "transfer", "digital"].map(
                              (method) => (
                                <button
                                  key={method}
                                  onClick={() => setPaymentMethod(method)}
                                  className={`p-2 lg:p-3 rounded-lg border-2 text-xs lg:text-sm font-semibold transition-all ${
                                    paymentMethod === method
                                      ? "border-blue-600 bg-blue-600 text-white"
                                      : "border-gray-300 bg-white text-gray-700 hover:border-blue-400"
                                  }`}
                                >
                                  {method.charAt(0).toUpperCase() +
                                    method.slice(1)}
                                </button>
                              )
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="space-y-2 lg:space-y-3">
                          <button
                            onClick={completeSale}
                            disabled={saleItems.length === 0 || loading}
                            className="w-full bg-green-600 text-white py-3 lg:py-4 rounded-xl hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-bold text-sm lg:text-lg transition-all duration-200 shadow-md hover:shadow-lg disabled:hover:shadow-md"
                          >
                            {loading
                              ? "Processing..."
                              : `✅ Complete Sale - $${total.toFixed(2)}`}
                          </button>
                          <button
                            onClick={clearSale}
                            className="w-full bg-gray-500 text-white py-2 lg:py-3 rounded-xl hover:bg-gray-600 font-semibold text-sm lg:text-base transition-all duration-200"
                          >
                            🗑️ Clear Cart
                          </button>
                        </div>
                      </div>

                      {/* Quick Actions */}
                      <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 lg:p-6">
                        <h4 className="font-bold text-blue-900 mb-3 lg:mb-4">
                          Quick Actions
                        </h4>
                        <div className="grid grid-cols-2 gap-2 lg:gap-3">
                          <button className="p-2 lg:p-3 bg-white rounded-lg border border-blue-300 hover:bg-blue-100 transition-colors text-xs lg:text-sm font-semibold text-blue-700">
                            📱 Quick Sale
                          </button>
                          <button className="p-2 lg:p-3 bg-white rounded-lg border border-blue-300 hover:bg-blue-100 transition-colors text-xs lg:text-sm font-semibold text-blue-700">
                            📦 Bulk Order
                          </button>
                          <button className="p-2 lg:p-3 bg-white rounded-lg border border-blue-300 hover:bg-blue-100 transition-colors text-xs lg:text-sm font-semibold text-blue-700">
                            🔄 Return
                          </button>
                          <button className="p-2 lg:p-3 bg-white rounded-lg border border-blue-300 hover:bg-blue-100 transition-colors text-xs lg:text-sm font-semibold text-blue-700">
                            🏷️ Apply Coupon
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "history" && (
                  <div className="space-y-6">
                    {/* Filters and Search */}
                    <div className="bg-white rounded-xl border border-gray-200 p-4 lg:p-6">
                      <div className="flex flex-col sm:flex-row gap-4 items-center">
                        <div className="flex-1 w-full">
                          <div className="relative">
                            <input
                              type="text"
                              placeholder="Search by sale ID..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="w-full px-4 py-3 pl-10 lg:pl-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm lg:text-base"
                            />
                            <div className="absolute left-3 lg:left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                              🔍
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 lg:gap-4 w-full sm:w-auto">
                          <input
                            type="date"
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            className="flex-1 px-3 lg:px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm lg:text-base"
                          />
                          <button
                            onClick={() => setShowExportModal(true)}
                            className="px-4 lg:px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 font-semibold text-sm lg:text-base transition-colors whitespace-nowrap flex items-center gap-2"
                          >
                            📤 Export
                          </button>
                          <button
                            onClick={fetchSalesHistory}
                            className="px-4 lg:px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 font-semibold text-sm lg:text-base transition-colors whitespace-nowrap"
                          >
                            Refresh
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Sales History */}
                    <div className="space-y-4">
                      {filteredSales.length === 0 ? (
                        <div className="text-center py-8 lg:py-12 bg-white rounded-xl border border-gray-200">
                          <div className="text-4xl lg:text-6xl mb-4">📋</div>
                          <h3 className="text-lg lg:text-xl font-bold text-gray-900 mb-2">
                            No sales records found
                          </h3>
                          <p className="text-gray-500 text-sm lg:text-base">
                            No sales match your search criteria
                          </p>
                        </div>
                      ) : (
                        filteredSales.map((sale) => (
                          <div
                            key={sale._id}
                            className="bg-white border border-gray-200 rounded-xl p-4 lg:p-6 hover:shadow-md transition-all duration-200"
                          >
                            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start mb-4 space-y-2 lg:space-y-0">
                              <div className="flex-1">
                                <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-3 mb-2">
                                  <h3 className="text-lg font-bold text-gray-900">
                                    {sale.saleNumber ||
                                      `Sale #${sale._id.slice(-6)}`}
                                  </h3>
                                  <span
                                    className={`px-2 lg:px-3 py-1 rounded-full text-xs font-semibold w-fit ${
                                      sale.paymentMethod === "cash"
                                        ? "bg-green-100 text-green-800"
                                        : sale.paymentMethod === "card"
                                        ? "bg-blue-100 text-blue-800"
                                        : "bg-purple-100 text-purple-800"
                                    }`}
                                  >
                                    {sale.paymentMethod.toUpperCase()}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-500">
                                  {new Date(sale.createdAt).toLocaleDateString(
                                    "en-US",
                                    {
                                      year: "numeric",
                                      month: "short",
                                      day: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    }
                                  )}
                                </p>
                              </div>
                              <div className="text-left lg:text-right">
                                <p className="text-xl lg:text-2xl font-bold text-gray-900">
                                  ${sale.total.toFixed(2)}
                                </p>
                                <p className="text-sm font-semibold text-green-600">
                                  Profit: ${sale.totalProfit.toFixed(2)}
                                </p>
                              </div>
                            </div>

                            <div className="border-t border-gray-200 pt-4">
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                <div>
                                  <h4 className="font-semibold text-gray-700 mb-2">
                                    Items Sold
                                  </h4>
                                  <div className="space-y-2">
                                    {sale.items.map((item, index) => (
                                      <div
                                        key={index}
                                        className="flex justify-between text-sm"
                                      >
                                        <span className="text-gray-600 truncate flex-1 mr-2">
                                          {item.productName} × {item.quantity}
                                        </span>
                                        <span className="font-medium text-gray-900 whitespace-nowrap">
                                          ${item.total.toFixed(2)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                <div>
                                  <h4 className="font-semibold text-gray-700 mb-2">
                                    Transaction Details
                                  </h4>
                                  <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">
                                        Subtotal:
                                      </span>
                                      <span>${sale.subtotal.toFixed(2)}</span>
                                    </div>
                                    {sale.discount > 0 && (
                                      <div className="flex justify-between">
                                        <span className="text-gray-600">
                                          Discount:
                                        </span>
                                        <span className="text-red-600">
                                          -${sale.discountAmount?.toFixed(2)}
                                        </span>
                                      </div>
                                    )}
                                    <div className="flex justify-between font-semibold border-t border-gray-200 pt-1">
                                      <span>Total:</span>
                                      <span>${sale.total.toFixed(2)}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">Export Sales Report</h3>
              <button
                onClick={() => setShowExportModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Date Range Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date Range
                </label>
                <select
                  value={exportRange}
                  onChange={(e) => setExportRange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="custom">Custom Range</option>
                </select>
              </div>

              {/* Custom Date Range */}
              {exportRange === 'custom' && (
                <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        End Date
                      </label>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Export Format Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Export Format
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleExport('pdf')}
                    disabled={isExporting || (exportRange === 'custom' && (!customStartDate || !customEndDate))}
                    className="flex items-center justify-center gap-2 bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold transition-colors"
                  >
                    {isExporting ? '⏳' : '📄'} PDF
                  </button>
                  <button
                    onClick={() => handleExport('excel')}
                    disabled={isExporting || (exportRange === 'custom' && (!customStartDate || !customEndDate))}
                    className="flex items-center justify-center gap-2 bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold transition-colors"
                  >
                    {isExporting ? '⏳' : '📊'} Excel
                  </button>
                </div>
              </div>

              {/* Export Info */}
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                <p className="text-xs text-blue-700">
                  <strong>Export includes:</strong> Sale ID, Date, Items, Payment Method, Total Amount, Profit, and Summary
                </p>
              </div>

              {/* Cancel Button */}
              <button
                onClick={() => {
                  setShowExportModal(false);
                  setCustomStartDate('');
                  setCustomEndDate('');
                }}
                className="w-full bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 font-semibold transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sales;