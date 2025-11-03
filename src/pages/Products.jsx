import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";

// Base URL for API
const API_BASE_URL = "http://localhost:8000/api";

const Products = () => {
  const location = useLocation();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortBy, setSortBy] = useState("name");
  const [editingProduct, setEditingProduct] = useState(null);
  const [viewMode, setViewMode] = useState("grid");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const categories = [
    "All",
    "T-Shirts",
    "Pants",
    "Dresses",
    "Shirts",
    "Jackets",
    "Shorts",
  ];
  const sizes = ["XS", "S", "M", "L", "XL", "XXL"];

  const menuItems = [
    { path: "/dashboard", name: "Dashboard", icon: "📊" },
    { path: "/products", name: "Products", icon: "👕" },
    { path: "/sales", name: "Sales", icon: "💰" },
    { path: "/reports", name: "Reports", icon: "📈" },
    { path: "/users", name: "User Management", icon: "👥" },
  ];

  // Quick stats for sidebar
  const [stats, setStats] = useState({
    totalProducts: { value: 156, trend: "+5%" },
    todaySales: { value: "2,450", trend: "+12%" },
    lowStockItems: { value: 8, trend: "-2" },
  });

  // API Functions
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/products`);
      const data = await response.json();

      if (data.success) {
        setProducts(data.data);
      } else {
        throw new Error(data.message || "Failed to fetch products");
      }
    } catch (err) {
      setError(err.message);
      console.error("Error fetching products:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLowStockProducts = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/products/alerts/low-stock`);
      const data = await response.json();
      return data.success ? data.data : [];
    } catch (err) {
      console.error("Error fetching low stock products:", err);
      return [];
    }
  };

  const createProduct = async (productData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/products`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(productData),
      });

      const data = await response.json();

      if (data.success) {
        await fetchProducts(); // Refresh the product list
        return { success: true, data: data.data };
      } else {
        throw new Error(data.message || "Failed to create product");
      }
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const updateProduct = async (productId, productData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/products/${productId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(productData),
      });

      const data = await response.json();

      if (data.success) {
        await fetchProducts(); // Refresh the product list
        return { success: true, data: data.data };
      } else {
        throw new Error(data.message || "Failed to update product");
      }
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const deleteProduct = async (productId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/products/${productId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        await fetchProducts(); // Refresh the product list
        return { success: true };
      } else {
        throw new Error(data.message || "Failed to delete product");
      }
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // Load products on component mount
  useEffect(() => {
    fetchProducts();
  }, []);

  // Filter and sort products
  const filteredProducts = products
    .filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.color.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.brand.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory =
        selectedCategory === "All" || product.category === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "price":
          return b.price - a.price;
        case "stock":
          return a.stockQuantity - b.stockQuantity;
        case "profit":
          return b.price - b.costPrice - (a.price - a.costPrice);
        default:
          return 0;
      }
    });

  const handleDeleteProduct = async (productId) => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      const result = await deleteProduct(productId);
      if (!result.success) {
        alert(`Failed to delete product: ${result.error}`);
      }
    }
  };

  const handleAddProduct = async (newProduct) => {
    const result = await createProduct(newProduct);
    if (result.success) {
      setShowAddForm(false);
    } else {
      alert(`Failed to create product: ${result.error}`);
    }
  };

  const handleUpdateProduct = async (updatedProduct) => {
    const result = await updateProduct(updatedProduct._id, updatedProduct);
    if (result.success) {
      setEditingProduct(null);
    } else {
      alert(`Failed to update product: ${result.error}`);
    }
  };

  const getStockStatus = (product) => {
    if (product.stockQuantity === 0)
      return {
        status: "Out of Stock",
        color: "red",
        bgColor: "bg-red-50",
        textColor: "text-red-700",
      };
    if (product.stockQuantity <= product.minStockLevel)
      return {
        status: "Low Stock",
        color: "orange",
        bgColor: "bg-orange-50",
        textColor: "text-orange-700",
      };
    return {
      status: "In Stock",
      color: "green",
      bgColor: "bg-green-50",
      textColor: "text-green-700",
    };
  };

  const calculateProfit = (product) => product.price - product.costPrice;
  const calculateMargin = (product) =>
    (((product.price - product.costPrice) / product.price) * 100).toFixed(1);

  // Calculate stats
  const totalProducts = products.length;
  const lowStockCount = products.filter(
    (p) => p.stockQuantity <= p.minStockLevel && p.stockQuantity > 0
  ).length;
  const outOfStockCount = products.filter((p) => p.stockQuantity === 0).length;
  const totalInventoryValue = products.reduce(
    (sum, p) => sum + p.stockQuantity * p.costPrice,
    0
  );

  const handleNavClick = () => {
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };

  // Product Form Component
  const ProductForm = ({ product, onSave, onCancel }) => {
    const [formData, setFormData] = useState(
      product || {
        name: "",
        category: "",
        size: "M",
        color: "",
        price: "",
        costPrice: "",
        stockQuantity: "",
        minStockLevel: 5,
        description: "",
        brand: "",
      }
    );

    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
      e.preventDefault();
      setSubmitting(true);

      try {
        await onSave({
          ...formData,
          price: parseFloat(formData.price),
          costPrice: parseFloat(formData.costPrice),
          stockQuantity: parseInt(formData.stockQuantity),
          minStockLevel: parseInt(formData.minStockLevel),
        });
      } finally {
        setSubmitting(false);
      }
    };

    const handleChange = (e) => {
      setFormData({
        ...formData,
        [e.target.name]: e.target.value,
      });
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {product ? "Edit Product" : "Add New Product"}
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Product Name */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Cotton T-Shirt"
                />
              </div>

              {/* Category and Size */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <select
                  name="category"
                  required
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Category</option>
                  {categories
                    .filter((cat) => cat !== "All")
                    .map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Size *
                </label>
                <select
                  name="size"
                  required
                  value={formData.size}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {sizes.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>

              {/* Color */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Color *
                </label>
                <input
                  type="text"
                  name="color"
                  required
                  value={formData.color}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Blue, Red, Black"
                />
              </div>

              {/* Prices */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cost Price ($) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="costPrice"
                  required
                  value={formData.costPrice}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Selling Price ($) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="price"
                  required
                  value={formData.price}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>

              {/* Stock Levels */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stock Quantity *
                </label>
                <input
                  type="number"
                  name="stockQuantity"
                  required
                  value={formData.stockQuantity}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Min Stock Level *
                </label>
                <input
                  type="number"
                  name="minStockLevel"
                  required
                  value={formData.minStockLevel}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="5"
                />
              </div>

              {/* Brand and Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Brand
                </label>
                <input
                  type="text"
                  name="brand"
                  value={formData.brand}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter brand name"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  rows="3"
                  value={formData.description}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter product description"
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onCancel}
                disabled={submitting}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
              >
                {submitting
                  ? "Saving..."
                  : product
                  ? "Update Product"
                  : "Add Product"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Loading State
  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">👕</div>
          <h2 className="text-xl font-semibold text-gray-600">
            Loading Products...
          </h2>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">❌</div>
          <h2 className="text-xl font-semibold text-red-600 mb-2">
            Error Loading Products
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchProducts}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
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
                  Products Management
                </h2>
                <p className="text-xs lg:text-sm text-gray-500 hidden sm:block">
                  Manage your clothing products and inventory
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

        {/* Products Content */}
        <main className="flex-1 overflow-auto p-4 lg:p-8">
          <div className="mb-6 lg:mb-8">
            <h1 className="text-2xl lg:text-4xl font-bold text-gray-900 mb-2">
              Product Inventory
            </h1>
            <p className="text-gray-600 text-sm lg:text-lg">
              Manage your clothing products and stock levels
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 lg:mb-8">
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">
                  Total Products
                </h3>
                <span className="text-blue-500 text-lg">👕</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {totalProducts}
              </p>
              <p className="text-sm text-gray-600">Active items</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">Low Stock</h3>
                <span className="text-orange-500 text-lg">⚠️</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {lowStockCount}
              </p>
              <p className="text-sm text-gray-600">Need restock</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">
                  Out of Stock
                </h3>
                <span className="text-red-500 text-lg">🚫</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {outOfStockCount}
              </p>
              <p className="text-sm text-gray-600">Urgent attention</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">
                  Inventory Value
                </h3>
                <span className="text-green-500 text-lg">💰</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                ${totalInventoryValue.toLocaleString()}
              </p>
              <p className="text-sm text-gray-600">Total stock value</p>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 lg:p-6 mb-6 lg:mb-8">
            <div className="flex flex-col lg:flex-row gap-4 lg:items-center justify-between">
              {/* Search Input */}
              <div className="flex-1 min-w-0">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-400">🔍</span>
                  </div>
                  <input
                    type="text"
                    placeholder="Search products by name, color, or brand..."
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                {/* Category Filter */}
                <select
                  className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>

                {/* Sort By */}
                <select
                  className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="name">Sort by Name</option>
                  <option value="price">Sort by Price</option>
                  <option value="stock">Sort by Stock</option>
                  <option value="profit">Sort by Profit</option>
                </select>

                {/* View Mode Toggle */}
                <div className="flex bg-blue-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                      viewMode === "grid"
                        ? "bg-blue-600 text-white shadow"
                        : "text-blue-700 hover:bg-blue-200"
                    }`}
                  >
                    Grid
                  </button>
                  <button
                    onClick={() => setViewMode("table")}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                      viewMode === "table"
                        ? "bg-blue-600 text-white shadow"
                        : "text-blue-700 hover:bg-blue-200"
                    }`}
                  >
                    Table
                  </button>
                </div>

                {/* Add Product Button */}
                <button
                  onClick={() => setShowAddForm(true)}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium whitespace-nowrap"
                >
                  + Add New Product
                </button>
              </div>
            </div>
          </div>

          {/* Products Display - Grid View */}
          {viewMode === "grid" && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredProducts.map((product) => {
                const stockStatus = getStockStatus(product);
                const profit = calculateProfit(product);
                const margin = calculateMargin(product);

                return (
                  <div
                    key={product._id}
                    className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300"
                  >
                    {/* Product Header */}
                    <div className="p-6 border-b border-gray-100">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 text-lg truncate">
                            {product.name}
                          </h3>
                          <p className="text-gray-500 text-sm truncate">
                            {product.brand} • {product.category}
                          </p>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${stockStatus.bgColor} ${stockStatus.textColor} whitespace-nowrap ml-3`}
                        >
                          {stockStatus.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xl font-bold text-gray-900">
                          ${product.price}
                        </span>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">
                            Stock:{" "}
                            <span
                              className={`font-semibold ${
                                product.stockQuantity <= product.minStockLevel
                                  ? "text-red-600"
                                  : "text-green-600"
                              }`}
                            >
                              {product.stockQuantity}
                            </span>
                          </p>
                          <p className="text-xs text-gray-500">
                            Min: {product.minStockLevel}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Product Details */}
                    <div className="p-6 space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Size:</span>
                          <p className="font-semibold text-gray-900">
                            {product.size}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500">Color:</span>
                          <p className="font-semibold text-gray-900">
                            {product.color}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500">Cost:</span>
                          <p className="font-semibold text-gray-900">
                            ${product.costPrice}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500">Profit:</span>
                          <p className="font-semibold text-green-600">
                            ${profit} ({margin}%)
                          </p>
                        </div>
                      </div>

                      {product.description && (
                        <div>
                          <span className="text-gray-500 text-sm">
                            Description:
                          </span>
                          <p className="text-gray-700 text-sm mt-1 line-clamp-2">
                            {product.description}
                          </p>
                        </div>
                      )}

                      <div className="text-xs text-gray-400">
                        Updated:{" "}
                        {new Date(product.updatedAt).toLocaleDateString()}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-between">
                      <button
                        onClick={() => setEditingProduct(product)}
                        className="text-blue-600 hover:text-blue-700 font-medium text-sm transition-colors flex items-center space-x-2"
                      >
                        <span>✏️</span>
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product._id)}
                        className="text-red-600 hover:text-red-700 font-medium text-sm transition-colors flex items-center space-x-2"
                      >
                        <span>🗑️</span>
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Empty State */}
          {filteredProducts.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-300 text-8xl mb-4">👕</div>
              <h3 className="text-xl font-bold text-gray-500 mb-2">
                No products found
              </h3>
              <p className="text-gray-400 mb-6">
                Try adjusting your search criteria or add a new product.
              </p>
              <button
                onClick={() => setShowAddForm(true)}
                className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 font-medium"
              >
                Add Your First Product
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Add/Edit Product Form Modal */}
      {(showAddForm || editingProduct) && (
        <ProductForm
          product={editingProduct}
          onSave={editingProduct ? handleUpdateProduct : handleAddProduct}
          onCancel={() => {
            setShowAddForm(false);
            setEditingProduct(null);
          }}
        />
      )}
    </div>
  );
};

export default Products;
