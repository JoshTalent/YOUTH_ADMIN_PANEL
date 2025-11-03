import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';

const UserManagement = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('All');
  const [sortBy, setSortBy] = useState('name');
  const [editingUser, setEditingUser] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [apiError, setApiError] = useState('');
  const [bulkActions, setBulkActions] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState(new Set());

  const BASE_URL = 'http://localhost:8000/api/users';

  // Get the actual roles from existing users to see what's valid
  const availableRoles = ['All', ...new Set(users.map(user => user.role))].filter(role => role !== 'All');
  const roles = ['All', ...availableRoles];

  const menuItems = [
    { path: '/dashboard', name: 'Dashboard', icon: '📊', badge: null },
    { path: '/products', name: 'Products', icon: '👕', badge: '12' },
    { path: '/sales', name: 'Sales', icon: '💰', badge: '3' },
    { path: '/reports', name: 'Reports', icon: '📈', badge: 'New' },
    { path: '/users', name: 'Users', icon: '👥', badge: null },
    { path: '/settings', name: 'Settings', icon: '⚙️', badge: null },
  ];

  // Fetch users from API
  const fetchUsers = async () => {
    setLoading(true);
    setApiError('');
    try {
      const response = await axios.get(BASE_URL);
      if (response.data.success) {
        setUsers(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setApiError('Failed to load users. Please check if the server is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Create new user via API
  const handleAddUser = async (userData) => {
    setLoading(true);
    setApiError('');
    try {
      const response = await axios.post(BASE_URL, userData);
      
      if (response.data.success) {
        await fetchUsers();
        setShowAddForm(false);
      }
    } catch (error) {
      console.error('Error creating user:', error);
      if (error.response?.data?.message) {
        setApiError(`Server Error: ${error.response.data.message}`);
      } else if (error.response?.data?.error) {
        setApiError(`Validation Error: ${error.response.data.error}`);
      } else {
        setApiError('Failed to create user. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Mock functions for update and delete
  const handleUpdateUser = async (updatedUser) => {
    console.log('Update user (mock):', updatedUser);
    setUsers(prev => prev.map(user => 
      user._id === updatedUser._id ? { ...user, ...updatedUser } : user
    ));
    setEditingUser(null);
  };

  const handleDeleteUser = async (userId, userName) => {
    if (window.confirm(`Are you sure you want to delete user "${userName}"?`)) {
      console.log('Delete user (mock):', userId);
      setUsers(prev => prev.filter(user => user._id !== userId));
    }
  };

  // Bulk actions
  const handleBulkAction = (action) => {
    if (selectedUsers.size === 0) {
      alert('Please select users first');
      return;
    }

    switch (action) {
      case 'delete':
        if (window.confirm(`Delete ${selectedUsers.size} selected users?`)) {
          setUsers(prev => prev.filter(user => !selectedUsers.has(user._id)));
          setSelectedUsers(new Set());
        }
        break;
      case 'export':
        alert(`Exporting ${selectedUsers.size} users...`);
        break;
      default:
        break;
    }
  };

  const toggleUserSelection = (userId) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const selectAllUsers = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map(user => user._id)));
    }
  };

  // Stats calculations
  const totalUsers = users.length;
  const activeUsers = users.length;
  const adminUsers = users.filter(u => u.role === 'admin' || u.role === 'Admin').length;

  // Filter and sort users
  const filteredUsers = users
    .filter(user => {
      const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           user.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = selectedRole === 'All' || user.role === selectedRole;
      return matchesSearch && matchesRole;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name': return a.name.localeCompare(b.name);
        case 'role': return a.role.localeCompare(b.role);
        default: return 0;
      }
    });

  const getRoleColor = (role) => {
    switch (role?.toLowerCase()) {
      case 'admin': return 'bg-gradient-to-r from-purple-500 to-purple-600 text-white';
      case 'manager': return 'bg-gradient-to-r from-blue-500 to-blue-600 text-white';
      case 'staff': return 'bg-gradient-to-r from-green-500 to-green-600 text-white';
      case 'viewer': return 'bg-gradient-to-r from-gray-500 to-gray-600 text-white';
      case 'user': return 'bg-gradient-to-r from-orange-500 to-orange-600 text-white';
      default: return 'bg-gradient-to-r from-gray-500 to-gray-600 text-white';
    }
  };

  const formatRole = (role) => {
    return role?.charAt(0).toUpperCase() + role?.slice(1).toLowerCase();
  };

  const handleNavClick = () => {
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };

  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  // User Form Component
  const UserForm = ({ user, onSave, onCancel }) => {
    const defaultRole = users.length > 0 ? users[0].role : 'user';
    
    const [formData, setFormData] = useState({
      name: user?.name || '',
      email: user?.email || '',
      password: '',
      role: user?.role || defaultRole
    });

    const [formErrors, setFormErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    const validateForm = () => {
      const errors = {};
      
      if (!formData.name.trim()) errors.name = 'Name is required';
      if (!formData.email.trim()) errors.email = 'Email is required';
      else if (!/\S+@\S+\.\S+/.test(formData.email)) errors.email = 'Email is invalid';
      
      if (!user && !formData.password) errors.password = 'Password is required';
      else if (formData.password && formData.password.length < 6) errors.password = 'Password must be at least 6 characters';
      
      if (!formData.role) errors.role = 'Role is required';

      setFormErrors(errors);
      return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      if (!validateForm()) return;

      setSubmitting(true);
      await onSave(formData);
      setSubmitting(false);
    };

    const handleChange = (e) => {
      const { name, value } = e.target;
      setFormData(prev => ({ ...prev, [name]: value }));
      if (formErrors[name]) {
        setFormErrors(prev => ({ ...prev, [name]: '' }));
      }
    };

    const availableRolesForForm = [...new Set(users.map(user => user.role))];
    if (availableRolesForForm.length === 0) {
      availableRolesForForm.push('user');
    }

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
          <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-2xl">
            <h2 className="text-xl font-bold">
              {user ? 'Edit User' : 'Add New User'}
            </h2>
            <p className="text-blue-100 text-sm mt-1">
              {user ? 'Update user information' : 'Create a new user account'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {apiError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{apiError}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name *
              </label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                  formErrors.name ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="Enter full name"
              />
              {formErrors.name && <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address *
              </label>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                  formErrors.email ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="user@company.com"
              />
              {formErrors.email && <p className="mt-1 text-sm text-red-600">{formErrors.email}</p>}
            </div>

            {!user && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password *
                </label>
                <input
                  type="password"
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                    formErrors.password ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="Enter password (min 6 characters)"
                />
                {formErrors.password && <p className="mt-1 text-sm text-red-600">{formErrors.password}</p>}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                User Role *
              </label>
              <select
                name="role"
                required
                value={formData.role}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                {availableRolesForForm.map(role => (
                  <option key={role} value={role}>
                    {formatRole(role)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onCancel}
                disabled={submitting}
                className="px-6 py-3 text-gray-700 border border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-50 font-medium transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 font-medium flex items-center space-x-2 transition-all shadow-lg hover:shadow-xl"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>{user ? 'Update User' : 'Create User'}</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Enhanced Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-80 bg-gradient-to-b from-gray-900 to-gray-800 shadow-2xl transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Sidebar Header */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-lg">FS</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">FashionStock</h1>
              <p className="text-gray-400 text-sm">Admin Portal</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Navigation</h3>
          <div className="space-y-1">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={handleNavClick}
                className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group ${
                  location.pathname === item.path
                    ? 'bg-blue-500 text-white shadow-lg'
                    : 'text-gray-300 hover:bg-gray-750 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-lg group-hover:scale-110 transition-transform">{item.icon}</span>
                  <span className="font-medium">{item.name}</span>
                </div>
                {item.badge && (
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    location.pathname === item.path
                      ? 'bg-white text-blue-600'
                      : 'bg-gray-700 text-gray-300'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </nav>

        {/* User Profile Section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-700 bg-gray-850">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-sm">SA</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium text-sm truncate">System Admin</p>
              <p className="text-gray-400 text-xs truncate">admin@fashionstock.com</p>
            </div>
            <button 
              onClick={() => navigate('/settings')}
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Enhanced Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="lg:hidden mr-4 p-2 rounded-xl text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div>
                <h2 className="text-xl font-bold text-gray-800">User Management</h2>
                <p className="text-gray-600 text-sm">Manage system users and permissions</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <button className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM10.5 3.75a6 6 0 010 11.25" />
                </svg>
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
              </button>
              
              {/* Search */}
              <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>

              {/* User Menu */}
              <div className="flex items-center space-x-3">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-gray-800">System Admin</p>
                  <p className="text-xs text-gray-600">Administrator</p>
                </div>
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-semibold text-sm">SA</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto p-6 bg-gradient-to-br from-gray-50 to-blue-50/30">
          {/* Header Section */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-3">User Management</h1>
            <p className="text-gray-600 text-lg">Manage system users, roles, and permissions with advanced controls</p>
          </div>

          {/* Enhanced Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition-all">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-600">Total Users</h3>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <span className="text-blue-600 text-xl">👥</span>
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900">{totalUsers}</p>
              <p className="text-sm text-gray-600 mt-2">Registered users in system</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition-all">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-600">Active Users</h3>
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <span className="text-green-600 text-xl">✅</span>
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900">{activeUsers}</p>
              <p className="text-sm text-gray-600 mt-2">Currently active</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition-all">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-600">Admin Users</h3>
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <span className="text-purple-600 text-xl">👑</span>
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900">{adminUsers}</p>
              <p className="text-sm text-gray-600 mt-2">Administrators</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition-all">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-600">Growth Rate</h3>
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                  <span className="text-orange-600 text-xl">📈</span>
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900">+12%</p>
              <p className="text-sm text-gray-600 mt-2">This month</p>
            </div>
          </div>

          {/* Enhanced Controls Bar */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-6">
            <div className="flex flex-col lg:flex-row gap-4 lg:items-center justify-between">
              {/* Search Input */}
              <div className="flex-1 min-w-0">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Search users by name, email, or role..."
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Bulk Actions */}
                {selectedUsers.size > 0 && (
                  <select
                    onChange={(e) => handleBulkAction(e.target.value)}
                    className="px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  >
                    <option value="">Bulk Actions ({selectedUsers.size})</option>
                    <option value="export">Export Selected</option>
                    <option value="delete">Delete Selected</option>
                  </select>
                )}

                {/* Role Filter */}
                <select
                  className="px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                >
                  {roles.map(role => (
                    <option key={role} value={role}>
                      {role === 'All' ? 'All Roles' : formatRole(role)}
                    </option>
                  ))}
                </select>

                {/* Sort By */}
                <select
                  className="px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="name">Sort by Name</option>
                  <option value="role">Sort by Role</option>
                  <option value="date">Sort by Date</option>
                </select>

                {/* Add User Button */}
                <button 
                  onClick={() => setShowAddForm(true)}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-purple-700 font-medium flex items-center space-x-2 transition-all shadow-lg hover:shadow-xl"
                >
                  <span className="text-lg">+</span>
                  <span>Add New User</span>
                </button>
              </div>
            </div>
          </div>

          {/* Enhanced Users Table */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            {loading ? (
              <div className="flex justify-center items-center py-16">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <span className="ml-4 text-gray-600 text-lg">Loading users...</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left">
                        <input
                          type="checkbox"
                          checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
                          onChange={selectAllUsers}
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">User</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Role</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredUsers.map(user => (
                      <tr key={user._id} className="hover:bg-gray-50 transition-colors group">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedUsers.has(user._id)}
                            onChange={() => toggleUserSelection(user._id)}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-semibold text-sm shadow-lg">
                              {getInitials(user.name)}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-semibold text-gray-900">{user.name}</div>
                              <div className="text-sm text-gray-500">ID: {user._id.slice(-8)}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getRoleColor(user.role)} shadow-md`}>
                            {formatRole(user.role)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {user.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                            Active
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => setEditingUser(user)}
                              className="text-blue-600 hover:text-blue-900 transition-colors flex items-center space-x-1"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user._id, user.name)}
                              className="text-red-600 hover:text-red-900 transition-colors flex items-center space-x-1"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              <span>Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Empty State */}
            {!loading && filteredUsers.length === 0 && (
              <div className="text-center py-16">
                <div className="text-gray-300 text-8xl mb-4">👥</div>
                <h3 className="text-2xl font-bold text-gray-500 mb-2">No users found</h3>
                <p className="text-gray-400 text-lg mb-8">Try adjusting your search criteria or add a new user to get started.</p>
                <button 
                  onClick={() => setShowAddForm(true)}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl hover:from-blue-700 hover:to-purple-700 font-medium text-lg shadow-lg hover:shadow-xl transition-all"
                >
                  Add Your First User
                </button>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Add/Edit User Form Modal */}
      {(showAddForm || editingUser) && (
        <UserForm
          user={editingUser}
          onSave={editingUser ? handleUpdateUser : handleAddUser}
          onCancel={() => {
            setShowAddForm(false);
            setEditingUser(null);
            setApiError('');
          }}
        />
      )}
    </div>
  );
};

export default UserManagement;