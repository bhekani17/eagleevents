import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Package, 
  Truck, 
  FileText, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  AlertCircle,
  Plus,
  Edit,
  Trash2,
  Eye
} from 'lucide-react';
import { adminAPI } from '../../services/api';

export function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalQuotes: 0,
    pendingQuotes: 0,
    totalBookings: 0,
    confirmedBookings: 0,
    totalCustomers: 0,
    totalEquipment: 0,
    totalPackages: 0,
    totalRevenue: 0,
    totalMessages: 0,
    newMessages: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [recentData, setRecentData] = useState({
    quotes: [],
    bookings: [],
    customers: [],
    equipment: []
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch dashboard data (quotes, equipment, customers, messages)
      const [quotesRes, equipmentRes, customersRes, messagesAllRes, messagesNewRes] = await Promise.all([
        adminAPI.getQuotes({ limit: 5 }).catch((e) => {
          console.warn('Quotes fetch failed:', e);
          return { data: [] };
        }),
        adminAPI.getEquipment({ limit: 5 }).catch((e) => {
          console.warn('Equipment fetch failed:', e);
          return { data: [] };
        }),
        adminAPI.getCustomers({ page: 1, limit: 5, search: '' }).catch((e) => {
          console.warn('Customers fetch failed:', e);
          return { data: [] };
        }),
        adminAPI.getMessages({ page: 1, limit: 1 }).catch((e) => {
          console.warn('Messages(all) fetch failed:', e);
          return { total: 0, items: [] };
        }),
        adminAPI.getMessages({ page: 1, limit: 1, status: 'new' }).catch((e) => {
          console.warn('Messages(new) fetch failed:', e);
          return { total: 0, items: [] };
        })
      ]);

      const quotes = quotesRes?.data || [];
      const equipment = equipmentRes?.data || [];
      const customers = customersRes?.data || [];
      const totalMessages = typeof messagesAllRes?.total === 'number' ? messagesAllRes.total : (Array.isArray(messagesAllRes?.items) ? messagesAllRes.items.length : Array.isArray(messagesAllRes) ? messagesAllRes.length : 0);
      const newMessages = typeof messagesNewRes?.total === 'number' ? messagesNewRes.total : (Array.isArray(messagesNewRes?.items) ? messagesNewRes.items.length : Array.isArray(messagesNewRes) ? messagesNewRes.length : 0);

      setRecentData({
        quotes,
        bookings: [],
        customers,
        equipment
      });

      // Compute minimal stats from available data
      setStats((prev) => ({
        ...prev,
        totalQuotes: Array.isArray(quotes) ? quotes.length : 0,
        totalEquipment: Array.isArray(equipment) ? equipment.length : 0,
        totalCustomers: Array.isArray(customers) ? customers.length : 0,
        totalMessages,
        newMessages
      }));

    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // (Analytics removed)

  const handleDelete = async (type, id) => {
    if (!window.confirm(`Are you sure you want to delete this ${type}?`)) {
      return;
    }

    try {
      switch (type) {
        case 'equipment':
          await adminAPI.deleteEquipment(id);
          break;
        case 'quote':
          await adminAPI.deleteQuote(id);
          break;
        case 'booking':
        case 'customer':
          alert('This operation is not available yet.');
          return;
        case 'package':
          await adminAPI.deletePackage(id);
          break;
      }
      
      // Refresh data
      await fetchDashboardData();
    } catch (err) {
      console.error(`Failed to delete ${type}:`, err);
      alert(`Failed to delete ${type}. Please try again.`);
    }
  };

  const handleView = (type, id) => {
    navigate(`/admin/${type}/${id}`);
  };

  const handleEdit = (type, id) => {
    navigate(`/admin/${type}/edit/${id}`);
  };

  const handleAdd = (type) => {
    navigate(`/admin/${type}/add`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Dashboard</h3>
        <p className="text-gray-600 mb-6">{error}</p>
        <button
          onClick={fetchDashboardData}
          className="px-6 py-3 bg-gold-600 text-black font-semibold rounded-lg hover:bg-gold-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <div className="flex space-x-2">
          <button
            onClick={() => handleAdd('equipment')}
            className="px-4 py-2 bg-gold-600 text-black font-semibold rounded-lg hover:bg-gold-700 transition-colors flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Equipment
          </button>
          <button
            onClick={() => handleAdd('package')}
            className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Package
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Quotes</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalQuotes}</p>
            </div>
          </div>
          <div className="mt-4">
            <span className="text-sm text-gray-500">Pending: {stats.pendingQuotes}</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100">
              <Calendar className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Bookings</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalBookings}</p>
            </div>
          </div>
          <div className="mt-4">
            <span className="text-sm text-gray-500">Confirmed: {stats.confirmedBookings}</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Customers</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalCustomers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-gold-100">
              <DollarSign className="w-6 h-6 text-gold-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">R{stats.totalRevenue?.toLocaleString() || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-lg shadow-md">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-red-100">
              <FileText className="w-5 h-5 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">New Messages</p>
              <p className="text-xl font-bold text-gray-900">{stats.newMessages}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-lg shadow-md">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-gray-100">
              <FileText className="w-5 h-5 text-gray-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Messages</p>
              <p className="text-xl font-bold text-gray-900">{stats.totalMessages}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-lg shadow-md">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-indigo-100">
              <Package className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Packages</p>
              <p className="text-xl font-bold text-gray-900">{stats.totalPackages}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics removed as requested */}

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="border-b border-gray-200 px-6 py-3">
          <h3 className="text-sm font-semibold text-gray-700">Dashboard Overview</h3>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Quotes */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Quotes</h3>
                  <div className="space-y-3">
                    {recentData.quotes.slice(0, 5).map((quote) => (
                      <div key={quote._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{quote.customerName}</p>
                          <p className="text-sm text-gray-600">{quote.eventType}</p>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleView('quotes', quote._id)}
                            className="p-1 text-blue-600 hover:text-blue-800"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEdit('quotes', quote._id)}
                            className="p-1 text-green-600 hover:text-green-800"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete('quote', quote._id)}
                            className="p-1 text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Bookings */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Bookings</h3>
                  <div className="space-y-3">
                    {recentData.bookings.slice(0, 5).map((booking) => (
                      <div key={booking._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{booking.customerName}</p>
                          <p className="text-sm text-gray-600">{booking.eventDate}</p>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleView('bookings', booking._id)}
                            className="p-1 text-blue-600 hover:text-blue-800"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEdit('bookings', booking._id)}
                            className="p-1 text-green-600 hover:text-green-800"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete('booking', booking._id)}
                            className="p-1 text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent Messages */}
              <div className="bg-white rounded-lg shadow-md">
                <div className="flex items-center justify-between p-4 border-b">
                  <h3 className="text-lg font-semibold text-gray-900">Recent Messages</h3>
                  <button
                    onClick={() => navigate('/admin/messages')}
                    className="px-3 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900 text-sm"
                  >
                    View All
                  </button>
                </div>
                <div className="p-4">
                  <p className="text-sm text-gray-500 mb-3">New: {stats.newMessages} • Total: {stats.totalMessages}</p>
                  <div className="text-sm text-gray-700">Keep an eye on new customer messages from the contact form.</div>
                </div>
              </div>
            </div>
          )}

          {/* Quotes Tab - Store and manage instant quotation requests and pricing offers */}
          {activeTab === 'quotes' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Recent Quotations</h3>
                <button
                  onClick={() => (window.location.href = '/admin/quotes')}
                  className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                >
                  Go to Quotations
                </button>
              </div>
              <div className="overflow-x-auto bg-gray-50 rounded-lg">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-600">
                      <th className="px-4 py-3">Reference</th>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3">Event Date</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Payment</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {(recentData.quotes || []).map((q) => (
                      <tr key={q._id} className="bg-white">
                        <td className="px-4 py-3 font-mono text-xs">
                          {q.referenceNumber || q.reference || q.ref || q._id?.slice(-6)}
                        </td>
                        <td className="px-4 py-3">{q.customerName || '—'}</td>
                        <td className="px-4 py-3">{q.eventDate ? new Date(q.eventDate).toLocaleDateString() : '—'}</td>
                        <td className="px-4 py-3">R{Number(q.totalAmount || 0).toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-800">
                            {q.status || 'pending'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-800">
                            {q.paymentStatus || 'pending'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button onClick={() => handleView('quotes', q._id)} className="p-1 text-blue-600 hover:text-blue-800"><Eye className="w-4 h-4" /></button>
                            <button onClick={() => handleEdit('quotes', q._id)} className="p-1 text-green-600 hover:text-green-800"><Edit className="w-4 h-4" /></button>
                            <button onClick={() => handleDelete('quote', q._id)} className="p-1 text-red-600 hover:text-red-800"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {(!recentData.quotes || recentData.quotes.length === 0) && (
                      <tr>
                        <td className="px-4 py-6 text-center text-gray-500" colSpan={7}>No quotations found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}


          {/* Customers Tab - Maintain a database of client details and history */}
          {activeTab === 'customers' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Customers</h3>
                <button
                  onClick={() => (window.location.href = '/admin/customers')}
                  className="px-3 py-2 bg-gray-900 text-white rounded-md hover:bg-black text-sm"
                >
                  Manage Customers
                </button>
              </div>
              <div className="space-y-3">
                {(recentData.customers || []).map((c) => {
                  const quoteCount = (recentData.quotes || []).filter(q => q.email && c.email && q.email.toLowerCase() === c.email.toLowerCase()).length;
                  return (
                    <div key={c._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{c.name || 'Unnamed Customer'}</p>
                        <p className="text-sm text-gray-600">{c.email}{c.phone ? ` • ${c.phone}` : ''}</p>
                        <p className="text-xs text-gray-500">Quotes: {quoteCount}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => (window.location.href = '/admin/customers')} className="px-3 py-1.5 text-sm rounded bg-white border hover:bg-gray-50">View</button>
                      </div>
                    </div>
                  );
                })}
                {(!recentData.customers || recentData.customers.length === 0) && (
                  <div className="text-center text-gray-500 py-10">No customers found.</div>
                )}
              </div>
            </div>
          )}

          {/* Equipment Tab */}
          {activeTab === 'equipment' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Equipment Management</h3>
                <button
                  onClick={() => handleAdd('equipment')}
                  className="px-4 py-2 bg-gold-600 text-black font-semibold rounded-lg hover:bg-gold-700 transition-colors flex items-center"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Equipment
                </button>
              </div>
              <div className="space-y-3">
                {recentData.equipment.map((item) => (
                  <div key={item._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{item.name}</p>
                      <p className="text-sm text-gray-600">{item.category}</p>
                      <p className="text-sm text-gray-500">Available: {item.inventory?.availableUnits || 0}</p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleView('equipment', item._id)}
                        className="p-1 text-blue-600 hover:text-blue-800"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEdit('equipment', item._id)}
                        className="p-1 text-green-600 hover:text-green-800"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete('equipment', item._id)}
                        className="p-1 text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Other tabs placeholder */}
          {activeTab !== 'overview' && activeTab !== 'equipment' && activeTab !== 'quotes' && activeTab !== 'customers' && (
            <div className="text-center py-8">
              <p className="text-gray-600">CRUD operations for {activeTab} will be implemented here.</p>
              <p className="text-sm text-gray-500 mt-2">This demonstrates the comprehensive admin panel structure.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
