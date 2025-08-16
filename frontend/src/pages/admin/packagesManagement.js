import axios from 'axios';
import { useState, useEffect } from 'react';
import { getAuthToken } from '../../services/api';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5003';
const API_URL = `${API_BASE}/api/packages`;
const UPLOAD_URL = `${API_BASE}/api/upload`;

// API Service Functions
// Normalize a package from backend to UI shape
const normalizeFromBackend = (pkg) => {
  if (!pkg || typeof pkg !== 'object') return pkg;
  if (!pkg.imageUrl && Array.isArray(pkg.images) && pkg.images.length > 0) {
    const primary = pkg.images.find(i => i && i.isPrimary) || pkg.images[0];
    if (primary && primary.url) {
      return { ...pkg, imageUrl: primary.url };
    }
  }
  return pkg;
};

const fetchAllPackages = async () => {
  try {
    const response = await axios.get(API_URL);
    const payload = response.data?.data ?? response.data;
    // Ensure we always return an array, even if the response is empty or malformed
    const list = Array.isArray(payload) ? payload : [];
    return list.map(normalizeFromBackend);
  } catch (error) {
    console.error('Error fetching packages:', error);
    // Return empty array on error to prevent crashes
    return [];
  }
};

const createNewPackage = async (packageData, token) => {
  try {
    console.log('Sending request to:', API_URL);
    // Map to backend expectations: basePrice and lowercase category
    const payload = {
      name: packageData.name,
      description: packageData.description || '',
      category: (packageData.category || 'other').toLowerCase(),
      basePrice: typeof packageData.price !== 'undefined' ? Number(packageData.price) : undefined,
      features: Array.isArray(packageData.features) ? packageData.features : [],
      includedServices: packageData.includedServices,
      includedEquipment: packageData.includedEquipment,
      specifications: packageData.specifications,
      isPopular: !!packageData.isPopular,
      isFeatured: !!packageData.isFeatured,
      images: packageData.images
    };
    if (packageData.imageUrl) {
      payload.images = [{ url: packageData.imageUrl, isPrimary: true }];
    }
    console.log('Request data:', JSON.stringify(payload, null, 2));
    
    const response = await axios.post(API_URL, payload, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      validateStatus: (status) => status < 500 // Don't throw for 4xx errors
    });
    
    console.log('Response status:', response.status);
    console.log('Response data:', response.data);
    
    if (response.status >= 400) {
      // Surface validation error messages if available
      const details = Array.isArray(response.data?.errors) ? `: ${response.data.errors.join(', ')}` : '';
      const error = new Error((response.data?.message || 'Failed to create package') + details);
      error.response = response;
      throw error;
    }
    
    // Controller returns { message, data }
    const created = response.data?.data || response.data;
    return normalizeFromBackend(created);
  } catch (error) {
    console.error('Error in createNewPackage:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      config: {
        url: error.config?.url,
        method: error.config?.method,
        data: error.config?.data
      }
    });
    
    // Enhance the error with more context
    if (!error.response) {
      error.message = 'Network error: Could not connect to the server. Please check your connection.';
    }
    
    throw error;
  }
};

const updatePackage = async (id, packageData, token) => {
  try {
    // Map to backend: ensure lowercase category and basePrice when price is provided
    const payload = {
      ...packageData,
      ...(packageData.category !== undefined && { category: String(packageData.category).toLowerCase() }),
      ...(packageData.price !== undefined && { basePrice: Number(packageData.price) })
    };
    if (payload.imageUrl !== undefined) {
      payload.images = payload.imageUrl ? [{ url: payload.imageUrl, isPrimary: true }] : [];
    }
    const response = await axios.put(`${API_URL}/${id}`, payload, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    // Controller returns { message, data }
    const updated = response.data?.data || response.data;
    return normalizeFromBackend(updated);
  } catch (error) {
    console.error('Error updating package:', error);
    throw error;
  }
};

const deletePackage = async (id, token) => {
  try {
    const response = await axios.delete(`${API_URL}/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error deleting package:', error);
    throw error;
  }
};

const getPackageById = async (id) => {
  try {
    const response = await axios.get(`${API_URL}/${id}`);
    return response.data?.data || response.data;
  } catch (error) {
    console.error('Error fetching package:', error);
    throw error;
  }
};

// React Component for Packages Management
export const PackagesManagement = () => {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editPackage, setEditPackage] = useState(null);
  
  // New package form state
  const [newPackage, setNewPackage] = useState({
    name: '',
    category: 'wedding', // Default category (lowercase to match backend enum)
    price: '',
    priceUnit: 'ZAR',
    description: '',
    imageUrl: '',
    features: [],
    isPopular: false,
    isFeatured: false
  });
  const [newFeature, setNewFeature] = useState('');
  const [uploadingAddImage, setUploadingAddImage] = useState(false);
  const [uploadingEditImage, setUploadingEditImage] = useState(false);
  // View controls (must be declared before any early returns)
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [onlyPopular, setOnlyPopular] = useState(false);
  const [onlyFeatured, setOnlyFeatured] = useState(false);

  // Helper: upload image file to backend and return URL
  const uploadImageFile = async (file) => {
    const formData = new FormData();
    formData.append('image', file);
    const resp = await axios.post(UPLOAD_URL, formData, {
      // Let the browser set the correct multipart boundary
      withCredentials: true,
    });
    // Backend returns { success, url, filename, ... }
    if (resp?.data?.url) return resp.data.url;
    // Fallback: path relative
    if (resp?.data?.path) {
      const backendOrigin = new URL(UPLOAD_URL).origin; // e.g., http://localhost:5003
      return new URL(resp.data.path, backendOrigin).href;
    }
    throw new Error('Upload failed: no URL returned');
  };

  useEffect(() => {
    const loadPackages = async () => {
      try {
        console.log('Fetching packages from:', API_URL);
        const data = await fetchAllPackages();
        console.log('Packages data received:', data);
        
        if (!data) {
          throw new Error('No data received from server');
        }
        
        if (!Array.isArray(data)) {
          console.warn('Expected array but received:', typeof data, data);
          setPackages([]);
          setError('Invalid data format received from server');
        } else {
          setPackages(data);
        }
      } catch (err) {
        console.error('Error in loadPackages:', err);
        setError(`Failed to load packages: ${err.message}`);
        setPackages([]); // Ensure packages is always an array
      } finally {
        setLoading(false);
      }
    };

    loadPackages();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this package?')) {
      try {
        const token = getAuthToken();
        if (!token) {
          setError('Authentication required. Please log in again.');
          window.location.href = '/admin/login?session=expired';
          return;
        }
        await deletePackage(id, token);
        setPackages(packages.filter(pkg => pkg._id !== id));
      } catch (err) {
        setError('Failed to delete package');
      }
    }
  };
  
  const handleAddPackage = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      // Ensure price is a number
      const packageData = {
        ...newPackage,
        price: parseFloat(newPackage.price) || 0
      };
      
      console.log('Sending package data:', packageData);
      
      const token = getAuthToken();
      console.log('Auth token:', token ? 'Token received' : 'No token');
      if (!token) {
        setError('Authentication required. Please log in again.');
        setLoading(false);
        window.location.href = '/admin/login?session=expired';
        return;
      }
      
      const created = await createNewPackage(packageData, token);
      console.log('Created package:', created);
      
      if (!created) {
        throw new Error('No response data from server');
      }
      
      // Add the new package to the list
      setPackages([...packages, created]);
      
      // Reset form and close modal
      setNewPackage({
        name: '',
        category: 'Wedding',
        price: '',
        priceUnit: 'ZAR',
        description: '',
        imageUrl: '',
        features: [],
        isPopular: false,
        isFeatured: false
      });
      setShowAddModal(false);
      setError(null); // Clear any previous errors
    } catch (err) {
      console.error('Error creating package:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        statusText: err.response?.statusText
      });
      
      let errorMessage = 'Failed to create package';
      
      // More specific error messages
      if (err.response?.status === 401) {
        errorMessage = 'Authentication failed. Please log in again.';
      } else if (err.response?.status === 400) {
        errorMessage = 'Invalid package data. Please check all fields.';
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  
  const handleAddFeature = (e) => {
    e.preventDefault();
    if (newFeature.trim() && !newPackage.features.includes(newFeature.trim())) {
      setNewPackage({
        ...newPackage,
        features: [...newPackage.features, newFeature.trim()]
      });
      setNewFeature('');
    }
  };
  
  const removeFeature = (featureToRemove) => {
    setNewPackage({
      ...newPackage,
      features: newPackage.features.filter(feature => feature !== featureToRemove)
    });
  };

  if (loading && packages.length === 0) return <div className="p-4">Loading packages...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;
  
  // Ensure packages is an array before mapping
  const packagesList = Array.isArray(packages) ? packages : [];
  
  // Available categories (values MUST match backend enum, lowercase)
  const categories = [
    'wedding',
    'corporate',
    'birthday',
    'conference',
    'exhibition',
    'private',
    'charity',
    'concert',
    'festival',
    'other'
  ];
  const labelFor = (val) => val.charAt(0).toUpperCase() + val.slice(1);

  // Local derived list based on filters

  const viewList = packagesList.filter((p) => {
    if (!p) return false;
    const matchesSearch = search
      ? (p.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.description || '').toLowerCase().includes(search.toLowerCase())
      : true;
    const matchesCategory = categoryFilter === 'all' ? true : (p.category === categoryFilter);
    const matchesPopular = onlyPopular ? !!p.isPopular : true;
    const matchesFeatured = onlyFeatured ? !!p.isFeatured : true;
    return matchesSearch && matchesCategory && matchesPopular && matchesFeatured;
  });

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Manage Packages</h1>
        <button 
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 flex items-center"
          onClick={() => setShowAddModal(true)}
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add New Package
        </button>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg p-4 border mb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            type="text"
            className="w-full p-2 border rounded"
            placeholder="Search by name or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="w-full p-2 border rounded"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{labelFor(cat)}</option>
            ))}
          </select>
          <label className="inline-flex items-center space-x-2 p-2 border rounded">
            <input type="checkbox" className="h-4 w-4" checked={onlyPopular} onChange={(e) => setOnlyPopular(e.target.checked)} />
            <span className="text-sm">Popular only</span>
          </label>
          <label className="inline-flex items-center space-x-2 p-2 border rounded">
            <input type="checkbox" className="h-4 w-4" checked={onlyFeatured} onChange={(e) => setOnlyFeatured(e.target.checked)} />
            <span className="text-sm">Featured only</span>
          </label>
        </div>
      </div>

      {/* Grid */}
      {viewList.length === 0 ? (
        <div className="py-8 text-center text-gray-500">No packages found</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {viewList.map((pkg) => (
            <div key={pkg._id} className="bg-white border rounded-lg overflow-hidden hover:shadow-sm transition-shadow">
              {pkg.imageUrl && (
                <div className="w-full h-40 bg-gray-50 overflow-hidden">
                  <img src={pkg.imageUrl} alt={pkg.name} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{pkg.name}</h3>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 border">{pkg.category ? labelFor(pkg.category) : 'Uncategorized'}</span>
                    {pkg.isPopular && <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 border border-yellow-200">Popular</span>}
                    {pkg.isFeatured && <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">Featured</span>}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-gray-900">{(pkg.basePrice ?? pkg.price ?? 0).toLocaleString()}</div>
                  <div className="text-xs text-gray-500">{pkg.priceUnit || 'ZAR'}</div>
                </div>
              </div>
              {pkg.description && (
                <p className="text-sm text-gray-600 line-clamp-3 mb-3">{pkg.description}</p>
              )}
              {Array.isArray(pkg.features) && pkg.features.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs text-gray-500 mb-1">Features</div>
                  <div className="flex flex-wrap gap-1">
                    {pkg.features.slice(0, 4).map((f, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded">{f}</span>
                    ))}
                    {pkg.features.length > 4 && (
                      <span className="text-xs text-gray-500">+{pkg.features.length - 4} more</span>
                    )}
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <button 
                  className="text-blue-600 hover:text-blue-800 text-sm"
                  onClick={() => {
                    setEditPackage({
                      _id: pkg._id,
                      name: pkg.name || '',
                      category: (pkg.category || 'other'),
                      price: String(pkg.basePrice ?? pkg.price ?? ''),
                      priceUnit: pkg.priceUnit || 'ZAR',
                      description: pkg.description || '',
                      imageUrl: pkg.imageUrl || '',
                      features: Array.isArray(pkg.features) ? pkg.features : [],
                      isPopular: Boolean(pkg.isPopular),
                      isFeatured: Boolean(pkg.isFeatured)
                    });
                    setShowEditModal(true);
                  }}
                >
                  Edit
                </button>
                <button 
                  className="text-red-600 hover:text-red-800 text-sm"
                  onClick={() => handleDelete(pkg._id)}
                >
                  Delete
                </button>
              </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Add Package Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Add New Package</h2>
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <form onSubmit={handleAddPackage}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Package Name *</label>
                    <input
                      type="text"
                      required
                      className="w-full p-2 border rounded"
                      value={newPackage.name}
                      onChange={(e) => setNewPackage({...newPackage, name: e.target.value})}
                      placeholder="Eagles Events – Full Event Service Package"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                    <select
                      required
                      className="w-full p-2 border rounded"
                      value={newPackage.category}
                      onChange={(e) => setNewPackage({...newPackage, category: e.target.value})}
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{labelFor(cat)}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Price *</label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 rounded-l border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                        {newPackage.priceUnit}
                      </span>
                      <input
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        className="flex-1 p-2 border rounded-r"
                        value={newPackage.price}
                        onChange={(e) => setNewPackage({...newPackage, price: e.target.value})}
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                    <input
                      type="url"
                      className="w-full p-2 border rounded"
                      value={newPackage.imageUrl}
                      onChange={(e) => setNewPackage({...newPackage, imageUrl: e.target.value})}
                      placeholder="https://.../image.jpg"
                    />
                    <div className="mt-2 flex items-center gap-3">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            setUploadingAddImage(true);
                            const url = await uploadImageFile(file);
                            setNewPackage(prev => ({ ...prev, imageUrl: url }));
                          } catch (err) {
                            console.error('Image upload failed:', err);
                            setError(err.message || 'Image upload failed');
                          } finally {
                            setUploadingAddImage(false);
                          }
                        }}
                        className="text-sm"
                      />
                      {uploadingAddImage && <span className="text-xs text-gray-500">Uploading...</span>}
                    </div>
                    {newPackage.imageUrl && (
                      <div className="mt-2">
                        <img src={newPackage.imageUrl} alt="Package preview" className="w-full h-32 object-cover rounded border" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-end space-x-4">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="isPopular"
                        className="h-4 w-4 text-blue-600 rounded"
                        checked={newPackage.isPopular}
                        onChange={(e) => setNewPackage({...newPackage, isPopular: e.target.checked})}
                      />
                      <label htmlFor="isPopular" className="ml-2 text-sm text-gray-700">Popular</label>
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="isFeatured"
                        className="h-4 w-4 text-blue-600 rounded"
                        checked={newPackage.isFeatured}
                        onChange={(e) => setNewPackage({...newPackage, isFeatured: e.target.checked})}
                      />
                      <label htmlFor="isFeatured" className="ml-2 text-sm text-gray-700">Featured</label>
                    </div>
                  </div>
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    rows="3"
                    className="w-full p-2 border rounded"
                    value={newPackage.description}
                    onChange={(e) => setNewPackage({...newPackage, description: e.target.value})}
                    placeholder={
                      `Make your special occasion stress-free with our complete mobile hire solution:\n\n` +
                      `🚻 VIP Mobile Toilets – clean, modern, and guest-friendly.\n` +
                      `❄️ Mobile Freezer – keep food and drinks perfectly chilled.\n` +
                      `⛺ Tents – elegant and weather-ready for any gathering.\n` +
                      `🐄 Slaughtering Services – fresh, professional, and convenient.\n\n` +
                      `Perfect for weddings, funerals, birthdays, family events, and corporate functions.\n` +
                      `We provide seamless hospitality and hygiene so you can focus on enjoying your event.`
                    }
                  />
                  <div className="mt-2">
                    <button
                      type="button"
                      className="text-sm text-blue-600 hover:text-blue-700 underline"
                      onClick={() => {
                        setNewPackage(prev => ({
                          ...prev,
                          name: prev.name || 'Eagles Events – Full Event Service Package',
                          description: (
                            'Make your special occasion stress-free with our complete mobile hire solution:\n\n' +
                            '🚻 VIP Mobile Toilets – clean, modern, and guest-friendly.\n' +
                            '❄️ Mobile Freezer – keep food and drinks perfectly chilled.\n' +
                            '⛺ Tents – elegant and weather-ready for any gathering.\n' +
                            '🐄 Slaughtering Services – fresh, professional, and convenient.\n\n' +
                            'Perfect for weddings, funerals, birthdays, family events, and corporate functions.\n' +
                            'We provide seamless hospitality and hygiene so you can focus on enjoying your event.'
                          ),
                          features: prev.features && prev.features.length > 0 ? prev.features : [
                            'VIP Mobile Toilets',
                            'Mobile Freezer',
                            'Tents',
                            'Slaughtering Services'
                          ]
                        }));
                      }}
                    >
                      Use “Full Event Service” template
                    </button>
                  </div>
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Features</label>
                  <div className="flex mb-2">
                    <input
                      type="text"
                      className="flex-1 p-2 border rounded-l"
                      value={newFeature}
                      onChange={(e) => setNewFeature(e.target.value)}
                      placeholder="Add a feature (e.g., 5 hours of service)"
                    />
                    <button
                      type="button"
                      onClick={handleAddFeature}
                      className="bg-blue-500 text-white px-4 py-2 rounded-r hover:bg-blue-600"
                    >
                      Add
                    </button>
                  </div>
                  
                  {newPackage.features.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {newPackage.features.map((feature, index) => (
                        <div key={index} className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded flex items-center">
                          {feature}
                          <button
                            type="button"
                            onClick={() => removeFeature(feature)}
                            className="ml-1.5 text-blue-400 hover:text-blue-600"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

      {/* Edit Package Modal */}
      {showEditModal && editPackage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Edit Package</h2>
                <button 
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={async (e) => {
                e.preventDefault();
                try {
                  setLoading(true);
                  const token = getAuthToken();
                  if (!token) {
                    setError('Authentication required. Please log in again.');
                    window.location.href = '/admin/login?session=expired';
                    return;
                  }
                  const payload = {
                    name: editPackage.name,
                    category: editPackage.category, // already lowercase from prefill
                    // backend maps price -> basePrice
                    price: parseFloat(editPackage.price) || 0,
                    priceUnit: editPackage.priceUnit,
                    description: editPackage.description,
                    imageUrl: editPackage.imageUrl,
                    features: Array.isArray(editPackage.features) ? editPackage.features : [],
                    isPopular: !!editPackage.isPopular,
                    isFeatured: !!editPackage.isFeatured
                  };
                  const updated = await updatePackage(editPackage._id, payload, token);

                  // Update list in place
                  setPackages(prev => prev.map(p => p._id === updated._id ? updated : p));
                  setShowEditModal(false);
                  setError(null);
                } catch (err) {
                  console.error('Error updating package:', err);
                  let msg = 'Failed to update package';
                  if (err.response?.status === 400) msg = 'Invalid data. Please check the fields.';
                  if (err.response?.status === 409) msg = 'A package with this name already exists.';
                  if (err.response?.data?.message) msg = err.response.data.message;
                  setError(msg);
                } finally {
                  setLoading(false);
                }
              }}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Package Name *</label>
                    <input
                      type="text"
                      required
                      className="w-full p-2 border rounded"
                      value={editPackage.name}
                      onChange={(e) => setEditPackage({...editPackage, name: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                    <select
                      required
                      className="w-full p-2 border rounded"
                      value={editPackage.category}
                      onChange={(e) => setEditPackage({...editPackage, category: e.target.value})}
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{labelFor(cat)}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Price *</label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 rounded-l border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                        {editPackage.priceUnit}
                      </span>
                      <input
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        className="flex-1 p-2 border rounded-r"
                        value={editPackage.price}
                        onChange={(e) => setEditPackage({...editPackage, price: e.target.value})}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                    <input
                      type="url"
                      className="w-full p-2 border rounded"
                      value={editPackage.imageUrl || ''}
                      onChange={(e) => setEditPackage({...editPackage, imageUrl: e.target.value})}
                      placeholder="https://.../image.jpg"
                    />
                    <div className="mt-2 flex items-center gap-3">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            setUploadingEditImage(true);
                            const url = await uploadImageFile(file);
                            setEditPackage(prev => ({ ...prev, imageUrl: url }));
                          } catch (err) {
                            console.error('Image upload failed:', err);
                            setError(err.message || 'Image upload failed');
                          } finally {
                            setUploadingEditImage(false);
                          }
                        }}
                        className="text-sm"
                      />
                      {uploadingEditImage && <span className="text-xs text-gray-500">Uploading...</span>}
                    </div>
                    {editPackage.imageUrl && (
                      <div className="mt-2">
                        <img src={editPackage.imageUrl} alt="Package preview" className="w-full h-32 object-cover rounded border" />
                      </div>
                    )}
                  </div>

                  <div className="flex items-end space-x-4">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="editIsPopular"
                        className="h-4 w-4 text-blue-600 rounded"
                        checked={!!editPackage.isPopular}
                        onChange={(e) => setEditPackage({...editPackage, isPopular: e.target.checked})}
                      />
                      <label htmlFor="editIsPopular" className="ml-2 text-sm text-gray-700">Popular</label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="editIsFeatured"
                        className="h-4 w-4 text-blue-600 rounded"
                        checked={!!editPackage.isFeatured}
                        onChange={(e) => setEditPackage({...editPackage, isFeatured: e.target.checked})}
                      />
                      <label htmlFor="editIsFeatured" className="ml-2 text-sm text-gray-700">Featured</label>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    className="w-full p-2 border rounded"
                    rows="3"
                    value={editPackage.description}
                    onChange={(e) => setEditPackage({...editPackage, description: e.target.value})}
                    placeholder={
                      `Make your special occasion stress-free with our complete mobile hire solution:\n\n` +
                      `🚻 VIP Mobile Toilets – clean, modern, and guest-friendly.\n` +
                      `❄️ Mobile Freezer – keep food and drinks perfectly chilled.\n` +
                      `⛺ Tents – elegant and weather-ready for any gathering.\n` +
                      `🐄 Slaughtering Services – fresh, professional, and convenient.\n\n` +
                      `Perfect for weddings, funerals, birthdays, family events, and corporate functions.\n` +
                      `We provide seamless hospitality and hygiene so you can focus on enjoying your event.`
                    }
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Features</label>
                  <div className="flex mb-2">
                    <input
                      type="text"
                      className="flex-1 p-2 border rounded-l"
                      placeholder="Add a feature"
                      value={newFeature}
                      onChange={(e) => setNewFeature(e.target.value)}
                    />
                    <button 
                      className="bg-green-500 text-white px-4 rounded-r hover:bg-green-600"
                      onClick={(e) => {
                        e.preventDefault();
                        if (newFeature.trim() && !editPackage.features.includes(newFeature.trim())) {
                          setEditPackage({
                            ...editPackage,
                            features: [...editPackage.features, newFeature.trim()]
                          });
                          setNewFeature('');
                        }
                      }}
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {Array.isArray(editPackage.features) && editPackage.features.map((feature, idx) => (
                      <span key={idx} className="bg-gray-100 text-gray-800 px-2 py-1 rounded flex items-center">
                        {feature}
                        <button 
                          className="ml-2 text-red-500 hover:text-red-700"
                          onClick={(e) => {
                            e.preventDefault();
                            setEditPackage({
                              ...editPackage,
                              features: editPackage.features.filter(f => f !== feature)
                            });
                          }}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <button 
                    type="button"
                    className="px-4 py-2 rounded border"
                    onClick={() => setShowEditModal(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                    disabled={loading}
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
                </div>
                
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : 'Save Package'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Export all the API functions for use elsewhere
export { 
  fetchAllPackages, 
  createNewPackage, 
  updatePackage, 
  deletePackage, 
  getPackageById 
};
