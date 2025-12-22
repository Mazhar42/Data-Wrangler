import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://data-cleansing-jf11.onrender.com';

const api = axios.create({
  baseURL: BACKEND_URL,
  withCredentials: true, // Send cookies with requests
});

// Request interceptor to add the access token to headers
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refreshing
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    // Guard against network errors where error.response is undefined
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const { data } = await api.post('/auth/refresh');
        localStorage.setItem('token', data.access_token);
        api.defaults.headers.common['Authorization'] = `Bearer ${data.access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('token');
        window.location.assign('/login?session=expired');
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);


const apiCall = async (endpoint, options = {}) => {
    try {
        const response = await api({
            url: endpoint,
            ...options,
        });
        return response.data;
    } catch (error) {
        if (error.response) {
            throw new Error(JSON.stringify(error.response.data.detail) || `HTTP ${error.response.status}`);
        } else {
            throw error;
        }
    }
};

const uploadFile = async (endpoint, formData) => {
    try {
        const response = await api.post(endpoint, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    } catch (error) {
        if (error.response) {
            throw new Error(error.response.data.detail || `HTTP ${error.response.status}`);
        } else {
            throw error;
        }
    }
};


// Authentication API
export const authAPI = {
  // Email/Password authentication
  register: (userData) => apiCall('/auth/register', {
    method: 'POST',
    data: userData,
  }),
  login: (credentials) => apiCall('/auth/login', {
    method: 'POST',
    data: credentials,
  }),
  logout: () => apiCall('/auth/logout', { method: 'POST' }),

  // Demo Login
  demoLogin: () => apiCall('/auth/demo', {
    method: 'POST'
  }),

  // Google OAuth
  getGoogleAuthUrl: () => apiCall('/auth/google/url'),
  googleCallback: (code) => apiCall('/auth/google/callback', {
    method: 'POST',
    data: { code },
  }),

  // Common
  getCurrentUser: () => apiCall('/auth/me'),
};

// Projects API
export const projectsAPI = {
  getAll: () => apiCall('/projects'),
  create: (project) => apiCall('/projects', {
    method: 'POST',
    data: project,
  }),
  getById: (id) => apiCall(`/projects/${id}`),
  update: (id, updates) => apiCall(`/projects/${id}`, {
    method: 'PUT',
    data: updates,
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
    apiCall(`/preview-modifications/${fileId}?page=${page}&per_page=${perPage}`, {
      method: 'POST',
      data: { modifications },
    }),
  downloadModified: async (fileId, modifications, format) => {
    const response = await api.post(`/download-modified-file/${fileId}`, { modifications, format }, {
        responseType: 'blob',
    });
    return response;
  },
  getStats: (fileId, columnNames) => apiCall(`/stats/${fileId}`, {
    method: 'POST',
    data: { column_names: columnNames },
  }),
  deleteFile: (fileId) => apiCall(`/files/${fileId}`, { method: 'DELETE' }),
  undo: (fileId) => apiCall(`/undo/${fileId}`, { method: 'POST' }),
  redo: (fileId) => apiCall(`/redo/${fileId}`, { method: 'POST' }),
  reset: (fileId) => apiCall(`/reset/${fileId}`, { method: 'POST' }),
  cleanseWithAI: (fileId, data) => apiCall(`/cleanse/ai/${fileId}`, {
    method: 'POST',
    data: data,
  }),
  getGroupSuggestions: (fileId, columnName, threshold) => apiCall(`/cleanse/group-suggestions/${fileId}`, {
    method: 'POST',
    data: { column_name: columnName, threshold },
  }),
  applyModifications: (fileId, modifications) => apiCall(`/apply-modifications/${fileId}`, {
    method: 'POST',
    data: { modifications },
  }),
  getCountrySuggestions: (fileId, columnName) => apiCall(`/cleanse/country-suggestions/${fileId}`, {
    method: 'POST',
    data: { column_name: columnName },
  }),
  detectAnomalies: (fileId, columnName, detectionType) => apiCall(`/cleanse/detect-anomalies/${fileId}`, {
    method: 'POST',
    data: { column_name: columnName, detection_type: detectionType },
  }),
  applyRule: (fileId, tool) => apiCall(`/files/${fileId}/apply_rule`, {
    method: 'POST',
    data: tool,
  }),
};

// Formulas API
export const formulasAPI = {
  getAll: (projectId) => apiCall(`/projects/${projectId}/formulas/`),
  create: (projectId, formula) => apiCall(`/projects/${projectId}/formulas/`, {
    method: 'POST',
    data: formula,
  }),
  getById: (projectId, id) => apiCall(`/projects/${projectId}/formulas/${id}`),
  delete: (projectId, id) => apiCall(`/projects/${projectId}/formulas/${id}`, {
    method: 'DELETE',
  }),
};

// Rules API
export const rulesAPI = {
  getAll: () => apiCall('/column-rules'),
  create: (rule) => apiCall('/column-rules', {
    method: 'POST',
    data: rule,
  }),
};

// History API
export const historyAPI = {
  getProjectHistory: (projectId) => apiCall(`/projects/${projectId}/history`),
};

// Chat API
export const chatAPI = {
  sendMessage: (messages, projectId, fileId) => {
    console.log('sendMessage data:', JSON.stringify({ messages, project_id: projectId, file_id: fileId }, null, 2));
    return apiCall('/api/v1/chat', {
      method: 'POST',
      data: { messages, project_id: projectId, file_id: fileId },
    });
  },
  getConversations: (projectId, fileId) => apiCall(`/api/v1/conversations/${projectId}/${fileId}`),
};



// Utility functions
export const utils = {
  compareColumns: (request) => apiCall('/compare_columns/', {
    method: 'POST',
    data: request,
  }),
  validateWaterfall: (fileId, equation, tolerance = 1e-6) => apiCall(`/waterfall/${fileId}`, {
    method: 'POST',
    data: { equation, tolerance },
  }),
  getSuggestions: (fileId, sampleSize = 10) => apiCall(`/suggestions/${fileId}?sample_size=${sampleSize}`),
  applySuggestions: (fileId, actions) => apiCall(`/apply-suggestions/${fileId}`, {
    method: 'POST',
    data: { actions },
  }),
};

// Admin API
export const adminAPI = {
  // Users
  listUsers: () => apiCall('/admin/users'),
  listUserRoles: (userId) => apiCall(`/admin/users/${userId}/roles`),
  listUserGroups: (userId) => apiCall(`/admin/users/${userId}/groups`),

  // Roles
  listRoles: () => apiCall('/admin/roles'),
  createRole: (role) => apiCall('/admin/roles', { method: 'POST', data: role }),
  deleteRole: (roleId) => apiCall(`/admin/roles/${roleId}`, { method: 'DELETE' }),

  // Groups
  listGroups: () => apiCall('/admin/groups'),
  createGroup: (group) => apiCall('/admin/groups', { method: 'POST', data: group }),
  deleteGroup: (groupId) => apiCall(`/admin/groups/${groupId}`, { method: 'DELETE' }),
  listGroupUsers: (groupId) => apiCall(`/admin/groups/${groupId}/users`),

  // Assignments
  assignRoleToUser: (userId, roleId) => apiCall(`/admin/users/${userId}/roles/${roleId}`, { method: 'POST' }),
  removeRoleFromUser: (userId, roleId) => apiCall(`/admin/users/${userId}/roles/${roleId}`, { method: 'DELETE' }),
  assignGroupToUser: (userId, groupId) => apiCall(`/admin/users/${userId}/groups/${groupId}`, { method: 'POST' }),
  removeGroupFromUser: (userId, groupId) => apiCall(`/admin/users/${userId}/groups/${groupId}`, { method: 'DELETE' }),
};
