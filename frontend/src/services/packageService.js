import { publicAPI, adminAPI } from './api';

/**
 * Package Service
 * Provides methods for interacting with the package API endpoints
 */
const packageService = {
  // ==================== PUBLIC ENDPOINTS ====================

  /**
   * Get all packages with optional filtering and pagination
   * @param {Object} filters - Filtering options
   * @returns {Promise<Array>} - Array of packages
   */
  getAllPackages: async (filters = {}) => {
    try {
      const response = await publicAPI.getPackages(filters);
      // Normalize various possible response shapes to always return an array
      // 1) API already returns an array
      if (Array.isArray(response)) return response;
      // 2) API returns { data: [...] }
      if (response && Array.isArray(response.data)) return response.data;
      // 3) API returns { data: { data: [...] } }
      if (response && response.data && Array.isArray(response.data.data)) return response.data.data;
      // 4) API returns { packages: [...] }
      if (response && Array.isArray(response.packages)) return response.packages;
      // 5) Fallback
      console.warn('Unexpected packages response shape (public):', response);
      return [];
    } catch (error) {
      console.error('Error fetching packages:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch packages');
    }
  },

  /**
   * Get a single package by ID (public)
   * @param {string} id - Package ID
   * @returns {Promise<Object>} - Package details
   */
  getPackageById: async (id) => {
    try {
      const response = await publicAPI.get(`/packages/${id}`);
      return response.data?.data || null;
    } catch (error) {
      console.error(`Error fetching package ${id}:`, error);
      throw new Error(error.response?.data?.message || 'Failed to fetch package');
    }
  },

  /**
   * Get packages by category
   * @param {string} category - Category to filter by
   * @returns {Promise<Array>} - Filtered packages
   */
  getPackagesByCategory: async (category) => {
    return packageService.getAllPackages({ category });
  },

  /**
   * Get featured packages
   * @returns {Promise<Array>} - Featured packages
   */
  getFeaturedPackages: async () => {
    try {
      const response = await publicAPI.get('/packages/featured');
      return response.data?.data || [];
    } catch (error) {
      console.error('Error fetching featured packages:', error);
      return [];
    }
  },

  // ==================== ADMIN ENDPOINTS ====================

  /**
   * Get all packages with admin-level access (includes inactive packages)
   * @param {Object} params - Query parameters (page, limit, search, etc.)
   * @returns {Promise<Object>} - Paginated response with packages and metadata
   */
  getAllPackagesAdmin: async (params = {}) => {
    try {
      console.log('Fetching packages with params:', params);
      
      // Make the API call directly to the packages endpoint
      const response = await adminAPI.get('/packages', { 
        params: {
          page: params.page || 1,
          limit: params.limit || 10,
          status: params.status || 'all',
          search: params.search || '',
          category: params.category || '',
          sortBy: params.sortBy || 'createdAt',
          sortOrder: params.sortOrder || 'desc'
        }
      });
      
      console.log('Packages API Response:', response);
      
      // Handle different response formats
      if (!response || !response.data) {
        console.warn('Unexpected API response format:', response);
        return [];
      }
      
      // If the response has a data array directly, return it
      if (Array.isArray(response.data)) {
        return response.data;
      }
      
      // If the response has a data object with a packages array
      if (response.data && Array.isArray(response.data.packages)) {
        return response.data.packages;
      }
      
      // If the response has a data object with a data array
      if (response.data && Array.isArray(response.data.data)) {
        return response.data.data;
      }
      
      // If we get here, the response format is unexpected
      console.warn('Unexpected API response format:', response);
      return [];
      
    } catch (error) {
      console.error('Error in getAllPackagesAdmin:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        stack: error.stack,
        config: error.config
      });
      
      // Rethrow the error to be handled by the component
      throw error;
    }
  },

  /**
   * Get a single package by ID (admin)
   * @param {string} id - Package ID
   * @returns {Promise<Object>} - Package details
   */
  getPackageByIdAdmin: async (id) => {
    try {
      const response = await adminAPI.get(`/packages/${id}`);
      return response.data?.data || null;
    } catch (error) {
      console.error(`Error fetching package ${id} (admin):`, error);
      throw new Error(error.response?.data?.message || 'Failed to fetch package');
    }
  },

  /**
   * Create a new package
   * @param {Object} packageData - Package data
   * @returns {Promise<Object>} - Created package
   */
  createPackage: async (packageData) => {
    try {
      // Handle image uploads if files are provided
      const toArray = (v) => (Array.isArray(v) ? v : (v ? [v] : []));
      const imageFiles = toArray(packageData.imageFile || packageData.image || packageData.imagesFiles || packageData.imagesFile);

      const uploaded = [];
      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        if (file && typeof File !== 'undefined' && file instanceof File) {
          const form = new FormData();
          form.append('image', file);
          const uploadRes = await adminAPI.post('/upload', form);
          const url = uploadRes?.url || uploadRes?.data?.url;
          if (url) uploaded.push({ url, isPrimary: i === 0 });
        }
      }

      // Build payload with images array preference order:
      // 1) uploaded images from files
      // 2) provided images array
      // 3) single imageUrl
      const payload = { ...packageData };
      if (uploaded.length) {
        payload.images = uploaded;
      } else if (packageData.images && Array.isArray(packageData.images)) {
        payload.images = packageData.images.map((u, idx) =>
          typeof u === 'string' ? { url: u, isPrimary: idx === 0 } : u
        );
      } else if (packageData.imageUrl) {
        payload.images = [{ url: packageData.imageUrl, isPrimary: true }];
      }

      // Remove file fields from payload to avoid JSON serialization issues
      delete payload.imageFile;
      delete payload.imagesFiles;
      delete payload.imagesFile;
      delete payload.image;

      const response = await adminAPI.post('/packages', payload);
      return response.data?.data || null;
    } catch (error) {
      console.error('Error creating package:', error);
      throw new Error(
        error.response?.data?.message || 
        error.response?.data?.errors?.[0]?.msg || 
        'Failed to create package'
      );
    }
  },

  /**
   * Update an existing package
   * @param {string} id - Package ID
   * @param {Object} packageData - Updated package data
   * @returns {Promise<Object>} - Updated package
   */
  updatePackage: async (id, packageData) => {
    try {
      const toArray = (v) => (Array.isArray(v) ? v : (v ? [v] : []));
      const imageFiles = toArray(packageData.imageFile || packageData.image || packageData.imagesFiles || packageData.imagesFile);

      const uploaded = [];
      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        if (file && typeof File !== 'undefined' && file instanceof File) {
          const form = new FormData();
          form.append('image', file);
          const uploadRes = await adminAPI.post('/upload', form);
          const url = uploadRes?.url || uploadRes?.data?.url;
          if (url) uploaded.push({ url, isPrimary: i === 0 });
        }
      }

      const payload = { ...packageData };
      if (uploaded.length) {
        payload.images = uploaded;
      } else if (packageData.images && Array.isArray(packageData.images)) {
        payload.images = packageData.images.map((u, idx) =>
          typeof u === 'string' ? { url: u, isPrimary: idx === 0 } : u
        );
      } else if (packageData.imageUrl !== undefined) {
        // Allow clearing image by passing empty string
        payload.images = packageData.imageUrl
          ? [{ url: packageData.imageUrl, isPrimary: true }]
          : [];
      }

      delete payload.imageFile;
      delete payload.imagesFiles;
      delete payload.imagesFile;
      delete payload.image;

      const response = await adminAPI.put(`/packages/${id}`, payload);
      return response.data?.data || null;
    } catch (error) {
      console.error(`Error updating package ${id}:`, error);
      throw new Error(
        error.response?.data?.message || 
        error.response?.data?.errors?.[0]?.msg || 
        'Failed to update package'
      );
    }
  },

  /**
   * Delete a package
   * @param {string} id - Package ID
   * @returns {Promise<boolean>} - Success status
   */
  deletePackage: async (id) => {
    try {
      await adminAPI.delete(`/packages/${id}`);
      return true;
    } catch (error) {
      console.error(`Error deleting package ${id}:`, error);
      throw new Error(error.response?.data?.message || 'Failed to delete package');
    }
  },

  /**
   * Toggle package active status
   * @param {string} id - Package ID
   * @returns {Promise<Object>} - Updated package
   */
  togglePackageStatus: async (id) => {
    try {
      const response = await adminAPI.patch(`/packages/${id}/toggle-active`);
      return response.data?.data || null;
    } catch (error) {
      console.error(`Error toggling package ${id} status:`, error);
      throw new Error(error.response?.data?.message || 'Failed to update package status');
    }
  },

  /**
   * Toggle package popular status
   * @param {string} id - Package ID
   * @returns {Promise<Object>} - Updated package
   */
  togglePopularStatus: async (id) => {
    try {
      const response = await adminAPI.patch(`/packages/${id}/toggle-popular`);
      return response.data?.data || null;
    } catch (error) {
      console.error(`Error toggling package ${id} popular status:`, error);
      throw new Error(error.response?.data?.message || 'Failed to update package popular status');
    }
  }
};

export default packageService;
