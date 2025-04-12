import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance with base URL
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to attach authorization token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// API functions for authentication
export const authAPI = {
  /**
   * Get current user information
   * @returns {Promise<Object>} User data
   */
  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

// API functions for posts
export const postsAPI = {
  /**
   * Get all posts with pagination
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Posts data with pagination
   */
  getPosts: async (params = {}) => {
    const response = await api.get('/posts', { params });
    return response.data;
  },

  /**
   * Get a single post by ID
   * @param {string} id - Post ID
   * @returns {Promise<Object>} Post data
   */
  getPost: async (id) => {
    const response = await api.get(`/posts/${id}`);
    return response.data;
  },

  /**
   * Create a new post
   * @param {Object} data - Post data
   * @returns {Promise<Object>} Created post
   */
  createPost: async (data) => {
    const response = await api.post('/posts', data);
    return response.data;
  },

  /**
   * Update a post
   * @param {string} id - Post ID
   * @param {Object} data - Updated post data
   * @returns {Promise<Object>} Updated post
   */
  updatePost: async (id, data) => {
    const response = await api.put(`/posts/${id}`, data);
    return response.data;
  },

  /**
   * Delete a post
   * @param {string} id - Post ID
   * @returns {Promise<Object>} Response data
   */
  deletePost: async (id) => {
    const response = await api.delete(`/posts/${id}`);
    return response.data;
  },

  /**
   * Get posts by user ID
   * @param {string} userId - User ID
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Posts data with pagination
   */
  getUserPosts: async (userId, params = {}) => {
    const response = await api.get(`/posts/user/${userId}`, { params });
    return response.data;
  },
};

// API functions for comments
export const commentsAPI = {
  /**
   * Get all comments with pagination
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Comments data with pagination
   */
  getComments: async (params = {}) => {
    const response = await api.get('/comments', { params });
    return response.data;
  },

  /**
   * Get a single comment by ID
   * @param {string} id - Comment ID
   * @returns {Promise<Object>} Comment data
   */
  getComment: async (id) => {
    const response = await api.get(`/comments/${id}`);
    return response.data;
  },

  /**
   * Create a new comment
   * @param {Object} data - Comment data
   * @returns {Promise<Object>} Created comment
   */
  createComment: async (data) => {
    const response = await api.post('/comments', data);
    return response.data;
  },

  /**
   * Update a comment
   * @param {string} id - Comment ID
   * @param {Object} data - Updated comment data
   * @returns {Promise<Object>} Updated comment
   */
  updateComment: async (id, data) => {
    const response = await api.put(`/comments/${id}`, data);
    return response.data;
  },

  /**
   * Delete a comment
   * @param {string} id - Comment ID
   * @returns {Promise<Object>} Response data
   */
  deleteComment: async (id) => {
    const response = await api.delete(`/comments/${id}`);
    return response.data;
  },

  /**
   * Get comments by user ID
   * @param {string} userId - User ID
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Comments data with pagination
   */
  getUserComments: async (userId, params = {}) => {
    const response = await api.get(`/comments/user/${userId}`, { params });
    return response.data;
  },
};

// API functions for reviews
export const reviewsAPI = {
  /**
   * Get all reviews with pagination
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Reviews data with pagination
   */
  getReviews: async (params = {}) => {
    const response = await api.get('/reviews', { params });
    return response.data;
  },

  /**
   * Get a single review by ID
   * @param {string} id - Review ID
   * @returns {Promise<Object>} Review data
   */
  getReview: async (id) => {
    const response = await api.get(`/reviews/${id}`);
    return response.data;
  },

  /**
   * Create a new review
   * @param {Object} data - Review data
   * @returns {Promise<Object>} Created review
   */
  createReview: async (data) => {
    const response = await api.post('/reviews', data);
    return response.data;
  },

  /**
   * Update a review
   * @param {string} id - Review ID
   * @param {Object} data - Updated review data
   * @returns {Promise<Object>} Updated review
   */
  updateReview: async (id, data) => {
    const response = await api.put(`/reviews/${id}`, data);
    return response.data;
  },

  /**
   * Delete a review
   * @param {string} id - Review ID
   * @returns {Promise<Object>} Response data
   */
  deleteReview: async (id) => {
    const response = await api.delete(`/reviews/${id}`);
    return response.data;
  },

  /**
   * Get reviews by user ID
   * @param {string} userId - User ID
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Reviews data with pagination
   */
  getUserReviews: async (userId, params = {}) => {
    const response = await api.get(`/reviews/user/${userId}`, { params });
    return response.data;
  },
};

// API functions for moderation
export const moderationAPI = {
  /**
   * Check content for moderation
   * @param {Object} data - Content data
   * @returns {Promise<Object>} Moderation result
   */
  checkContent: async (data) => {
    const response = await api.post('/moderation/check', data);
    return response.data;
  },

  /**
   * Get flagged content for the current user
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Flagged content data with pagination
   */
  getFlaggedContent: async (params = {}) => {
    const response = await api.get('/moderation/flagged', { params });
    return response.data;
  },

  /**
   * Update email notification preferences
   * @param {boolean} emailNotification - Email notification preference
   * @returns {Promise<Object>} Response data
   */
  updatePreferences: async (emailNotification) => {
    const response = await api.put('/moderation/preferences', { emailNotification });
    return response.data;
  },
};

// API functions for admin
export const adminAPI = {
  /**
   * Get all flagged content (admin only)
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Flagged content data with pagination
   */
  getAllFlaggedContent: async (params = {}) => {
    const response = await api.get('/admin/flagged', { params });
    return response.data;
  },

  /**
   * Approve flagged content (admin only)
   * @param {string} id - Flagged content ID
   * @returns {Promise<Object>} Response data
   */
  approveFlaggedContent: async (id) => {
    const response = await api.put(`/admin/flagged/${id}/approve`);
    return response.data;
  },

  /**
   * Reject flagged content (admin only)
   * @param {string} id - Flagged content ID
   * @param {string} reason - Rejection reason
   * @returns {Promise<Object>} Response data
   */
  rejectFlaggedContent: async (id, reason) => {
    const response = await api.put(`/admin/flagged/${id}/reject`, { reason });
    return response.data;
  },

  /**
   * Get all users (admin only)
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Users data with pagination
   */
  getUsers: async (params = {}) => {
    const response = await api.get('/admin/users', { params });
    return response.data;
  },

  /**
   * Update user role (admin only)
   * @param {string} id - User ID
   * @param {string} role - New role (USER or ADMIN)
   * @returns {Promise<Object>} Response data
   */
  updateUserRole: async (id, role) => {
    const response = await api.put(`/admin/users/${id}/role`, { role });
    return response.data;
  },

  /**
   * Get system statistics (admin only)
   * @returns {Promise<Object>} System statistics
   */
  getStats: async () => {
    const response = await api.get('/admin/stats');
    return response.data;
  },
};

// Export the API instance for custom requests
export default api;