const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://data-cleansing-jf11.onrender.com';

// Helper function to make authenticated API calls
const apiCall = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    ...options,
  };

  const response = await fetch(`${BACKEND_URL}${endpoint}`, config);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `HTTP ${response.status}`);
  }

  return response.json();
};

// Helper function for file uploads
const uploadFile = async (endpoint, formData) => {
  const token = localStorage.getItem('token');
  const config = {
    method: 'POST',
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: formData,
  };

  const response = await fetch(`${BACKEND_URL}${endpoint}`, config);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `HTTP ${response.status}`);
  }

  return response.json();
};

// Authentication API
export const authAPI = {
  // Email/Password authentication
  register: (userData) => apiCall('/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData),
  }),
  login: (credentials) => apiCall('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  }),
  
  // Microsoft OAuth
  getMicrosoftAuthUrl: () => apiCall('/auth/microsoft/url'),
  microsoftCallback: (code) => apiCall('/auth/microsoft/callback', {
    method: 'POST',
    body: JSON.stringify({ code }),
  }),
  
  // Google OAuth
  getGoogleAuthUrl: () => apiCall('/auth/google/url'),
  googleCallback: (code) => apiCall('/auth/google/callback', {
    method: 'POST',
    body: JSON.stringify({ code }),
  }),
  
  // Common
  getCurrentUser: () => apiCall('/auth/me'),
};

// Projects API
export const projectsAPI = {
  getAll: () => apiCall('/projects'),
  create: (project) => apiCall('/projects', {
    method: 'POST',
    body: JSON.stringify(project),
  }),
  getById: (id) => apiCall(`/projects/${id}`),
  update: (id, updates) => apiCall(`/projects/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  }),
  delete: (id) => apiCall(`/projects/${id}`, {
    method: 'DELETE',
  }),
  uploadFile: (projectId, formData) => uploadFile(`/projects/${projectId}/upload`, formData),
};

// Files API (updated for project context)
export const filesAPI = {
  getContent: (fileId, page = 1, perPage = 50) => 
    apiCall(`/files/${fileId}?page=${page}&per_page=${perPage}`),
  getStatus: (fileId) => apiCall(`/files/${fileId}/status`),
  getUniqueColumns: (fileId) => apiCall(`/unique-columns/${fileId}`),
  previewModifications: (fileId, modifications, page = 1, perPage = 50) => 
    apiCall(`/preview-modifications/${fileId}`, {
      method: 'POST',
      body: JSON.stringify({ modifications, page, per_page: perPage }),
    }),
  downloadModified: async (fileId, modifications, format) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${BACKEND_URL}/download-modified-file/${fileId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ modifications, format }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP ${response.status}`);
    }

    return response; // Return response for blob handling
  },
  getStats: (fileId, columnNames) => apiCall(`/stats/${fileId}`, {
    method: 'POST',
    body: JSON.stringify({ column_names: columnNames }),
  }),
  deleteFile: (fileId) => apiCall(`/files/${fileId}`, { method: 'DELETE' }),
};

// Formulas API
export const formulasAPI = {
  getAll: () => apiCall('/formulas/'),
  create: (formula) => apiCall('/formulas/', {
    method: 'POST',
    body: JSON.stringify(formula),
  }),
  getById: (id) => apiCall(`/formulas/${id}`),
  delete: (id) => apiCall(`/formulas/${id}`, {
    method: 'DELETE',
  }),
};

// Rules API
export const rulesAPI = {
  getAll: () => apiCall('/column-rules'),
  create: (rule) => apiCall('/column-rules', {
    method: 'POST',
    body: JSON.stringify(rule),
  }),
};

// History API
export const historyAPI = {
  getAll: () => apiCall('/history/'),
};

// Utility functions
export const utils = {
  compareColumns: (request) => apiCall('/compare_columns/', {
    method: 'POST',
    body: JSON.stringify(request),
  }),
  validateWaterfall: (fileId, equation, tolerance = 1e-6) => apiCall(`/waterfall/${fileId}`, {
    method: 'POST',
    body: JSON.stringify({ equation, tolerance }),
  }),
  getSuggestions: (fileId, sampleSize = 10) => apiCall(`/suggestions/${fileId}?sample_size=${sampleSize}`),
  applySuggestions: (fileId, actions) => apiCall(`/apply-suggestions/${fileId}`, {
    method: 'POST',
    body: JSON.stringify({ actions }),
  }),
};
