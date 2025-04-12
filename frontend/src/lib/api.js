import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance with base URL
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helper to add auth header if token is provided
const getAuthConfig = (token) => {
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
};


// API functions for authentication
export const authAPI = {
  /**
   * Get current user information
   * @param {string} token - Clerk JWT token
   * @returns {Promise<Object>} User data { user: UserObject }
   */
  getMe: async (token) => {
    if (!token) throw new Error("Authentication token is required for getMe.");
    const response = await api.get('/auth/me', getAuthConfig(token));
    return response.data; // Expects { user: {...} }
  },
};

// API functions for posts
export const postsAPI = {
  /**
   * Get all posts with pagination
   * @param {Object} params - Query parameters
   * @param {string} [token] - Optional Clerk JWT token
   * @returns {Promise<Object>} Posts data with pagination
   */
  getPosts: async (params = {}, token) => {
    // Public route, token is optional
    const response = await api.get('/posts', { params, ...getAuthConfig(token) });
    return response.data;
  },

  /**
   * Get a single post by ID
   * @param {string} id - Post ID
   * @param {string} [token] - Optional Clerk JWT token
   * @returns {Promise<Object>} Post data
   */
  getPost: async (id, token) => {
    // Public route, token is optional
    const response = await api.get(`/posts/${id}`, getAuthConfig(token));
    return response.data;
  },

  /**
   * Create a new post
   * @param {Object} data - Post data
   * @param {string} token - Clerk JWT token
   * @returns {Promise<Object>} Created post
   */
  createPost: async (data, token) => {
    if (!token) throw new Error("Authentication token is required to create a post.");
    const response = await api.post('/posts', data, getAuthConfig(token));
    return response.data;
  },

  /**
   * Update a post
   * @param {string} id - Post ID
   * @param {Object} data - Updated post data
   * @param {string} token - Clerk JWT token
   * @returns {Promise<Object>} Updated post
   */
  updatePost: async (id, data, token) => {
     if (!token) throw new Error("Authentication token is required to update a post.");
    const response = await api.put(`/posts/${id}`, data, getAuthConfig(token));
    return response.data;
  },

  /**
   * Delete a post
   * @param {string} id - Post ID
   * @param {string} token - Clerk JWT token
   * @returns {Promise<Object>} Response data
   */
  deletePost: async (id, token) => {
     if (!token) throw new Error("Authentication token is required to delete a post.");
    const response = await api.delete(`/posts/${id}`, getAuthConfig(token));
    return response.data;
  },

  /**
   * Get posts by user ID
   * @param {string} userId - User ID
   * @param {Object} params - Query parameters
   * @param {string} [token] - Optional Clerk JWT token
   * @returns {Promise<Object>} Posts data with pagination
   */
  getUserPosts: async (userId, params = {}, token) => {
    // Public route, token is optional
    const response = await api.get(`/posts/user/${userId}`, { params, ...getAuthConfig(token) });
    return response.data;
  },
};

// API functions for comments
export const commentsAPI = {
  /**
   * Get all comments with pagination
   * @param {Object} params - Query parameters
   * @param {string} [token] - Optional Clerk JWT token
   * @returns {Promise<Object>} Comments data with pagination
   */
  getComments: async (params = {}, token) => {
    // Public route, token is optional
    const response = await api.get('/comments', { params, ...getAuthConfig(token) });
    return response.data;
  },

  /**
   * Get a single comment by ID
   * @param {string} id - Comment ID
   * @param {string} [token] - Optional Clerk JWT token
   * @returns {Promise<Object>} Comment data
   */
  getComment: async (id, token) => {
    // Public route, token is optional
    const response = await api.get(`/comments/${id}`, getAuthConfig(token));
    return response.data;
  },

  /**
   * Create a new comment
   * @param {Object} data - Comment data
   * @param {string} token - Clerk JWT token
   * @returns {Promise<Object>} Created comment
   */
  createComment: async (data, token) => {
     if (!token) throw new Error("Authentication token is required to create a comment.");
    const response = await api.post('/comments', data, getAuthConfig(token));
    return response.data;
  },

  /**
   * Update a comment
   * @param {string} id - Comment ID
   * @param {Object} data - Updated comment data
   * @param {string} token - Clerk JWT token
   * @returns {Promise<Object>} Updated comment
   */
  updateComment: async (id, data, token) => {
     if (!token) throw new Error("Authentication token is required to update a comment.");
    const response = await api.put(`/comments/${id}`, data, getAuthConfig(token));
    return response.data;
  },

  /**
   * Delete a comment
   * @param {string} id - Comment ID
   * @param {string} token - Clerk JWT token
   * @returns {Promise<Object>} Response data
   */
  deleteComment: async (id, token) => {
     if (!token) throw new Error("Authentication token is required to delete a comment.");
    const response = await api.delete(`/comments/${id}`, getAuthConfig(token));
    return response.data;
  },

  /**
   * Get comments by user ID
   * @param {string} userId - User ID
   * @param {Object} params - Query parameters
   * @param {string} [token] - Optional Clerk JWT token
   * @returns {Promise<Object>} Comments data with pagination
   */
  getUserComments: async (userId, params = {}, token) => {
    // Public route, token is optional
    const response = await api.get(`/comments/user/${userId}`, { params, ...getAuthConfig(token) });
    return response.data;
  },
};

// API functions for reviews
export const reviewsAPI = {
  /**
   * Get all reviews with pagination
   * @param {Object} params - Query parameters
   * @param {string} [token] - Optional Clerk JWT token
   * @returns {Promise<Object>} Reviews data with pagination
   */
  getReviews: async (params = {}, token) => {
    // Public route, token is optional
    const response = await api.get('/reviews', { params, ...getAuthConfig(token) });
    return response.data;
  },

  /**
   * Get a single review by ID
   * @param {string} id - Review ID
   * @param {string} [token] - Optional Clerk JWT token
   * @returns {Promise<Object>} Review data
   */
  getReview: async (id, token) => {
    // Public route, token is optional
    const response = await api.get(`/reviews/${id}`, getAuthConfig(token));
    return response.data;
  },

  /**
   * Create a new review
   * @param {Object} data - Review data
   * @param {string} token - Clerk JWT token
   * @returns {Promise<Object>} Created review
   */
  createReview: async (data, token) => {
     if (!token) throw new Error("Authentication token is required to create a review.");
    const response = await api.post('/reviews', data, getAuthConfig(token));
    return response.data;
  },

  /**
   * Update a review
   * @param {string} id - Review ID
   * @param {Object} data - Updated review data
   * @param {string} token - Clerk JWT token
   * @returns {Promise<Object>} Updated review
   */
  updateReview: async (id, data, token) => {
     if (!token) throw new Error("Authentication token is required to update a review.");
    const response = await api.put(`/reviews/${id}`, data, getAuthConfig(token));
    return response.data;
  },

  /**
   * Delete a review
   * @param {string} id - Review ID
   * @param {string} token - Clerk JWT token
   * @returns {Promise<Object>} Response data
   */
  deleteReview: async (id, token) => {
     if (!token) throw new Error("Authentication token is required to delete a review.");
    const response = await api.delete(`/reviews/${id}`, getAuthConfig(token));
    return response.data;
  },

  /**
   * Get reviews by user ID
   * @param {string} userId - User ID
   * @param {Object} params - Query parameters
   * @param {string} [token] - Optional Clerk JWT token
   * @returns {Promise<Object>} Reviews data with pagination
   */
  getUserReviews: async (userId, params = {}, token) => {
    // Public route, token is optional
    const response = await api.get(`/reviews/user/${userId}`, { params, ...getAuthConfig(token) });
    return response.data;
  },
};

// API functions for moderation
export const moderationAPI = {
  /**
   * Check content for moderation
   * @param {Object} data - Content data
   * @param {string} token - Clerk JWT token
   * @returns {Promise<Object>} Moderation result
   */
  checkContent: async (data, token) => {
     if (!token) throw new Error("Authentication token is required to check content.");
    const response = await api.post('/moderation/check', data, getAuthConfig(token));
    return response.data;
  },

  /**
   * Get flagged content for the current user
   * @param {Object} params - Query parameters
   * @param {string} token - Clerk JWT token
   * @returns {Promise<Object>} Flagged content data with pagination
   */
  getFlaggedContent: async (params = {}, token) => {
    if (!token) throw new Error("Authentication token is required to get flagged content.");
    const response = await api.get('/moderation/flagged', { params, ...getAuthConfig(token) });
    return response.data;
  },

  /**
   * Update email notification preferences
   * @param {boolean} emailNotification - Email notification preference
   * @param {string} token - Clerk JWT token
   * @returns {Promise<Object>} Response data containing { emailNotification: boolean }
   */
  updatePreferences: async (emailNotification, token) => {
     if (!token) throw new Error("Authentication token is required to update preferences.");
    const response = await api.put('/moderation/preferences', { emailNotification }, getAuthConfig(token));
    return response.data; // Expects { emailNotification: boolean }
  },
};

// API functions for admin
export const adminAPI = {
  /**
   * Get all flagged content (admin only)
   * @param {Object} params - Query parameters
   * @param {string} token - Clerk JWT token
   * @returns {Promise<Object>} Flagged content data with pagination
   */
  getAllFlaggedContent: async (params = {}, token) => {
     if (!token) throw new Error("Authentication token is required for admin actions.");
    const response = await api.get('/admin/flagged', { params, ...getAuthConfig(token) });
    return response.data;
  },

  /**
   * Approve flagged content (admin only)
   * @param {string} id - Flagged content ID
   * @param {string} token - Clerk JWT token
   * @returns {Promise<Object>} Response data
   */
  approveFlaggedContent: async (id, token) => {
     if (!token) throw new Error("Authentication token is required for admin actions.");
    const response = await api.put(`/admin/flagged/${id}/approve`, null, getAuthConfig(token));
    return response.data;
  },

  /**
   * Reject flagged content (admin only)
   * @param {string} id - Flagged content ID
   * @param {string} reason - Rejection reason
   * @param {string} token - Clerk JWT token
   * @returns {Promise<Object>} Response data
   */
  rejectFlaggedContent: async (id, reason, token) => {
     if (!token) throw new Error("Authentication token is required for admin actions.");
    const response = await api.put(`/admin/flagged/${id}/reject`, { reason }, getAuthConfig(token));
    return response.data;
  },

  /**
   * Get all users (admin only)
   * @param {Object} params - Query parameters
   * @param {string} token - Clerk JWT token
   * @returns {Promise<Object>} Users data with pagination
   */
  getUsers: async (params = {}, token) => {
     if (!token) throw new Error("Authentication token is required for admin actions.");
    const response = await api.get('/admin/users', { params, ...getAuthConfig(token) });
    return response.data;
  },

  /**
   * Update user role (admin only)
   * @param {string} id - User ID
   * @param {string} role - New role (USER or ADMIN)
   * @param {string} token - Clerk JWT token
   * @returns {Promise<Object>} Response data containing the updated user { user: UserObject }
   */
  updateUserRole: async (id, role, token) => {
     if (!token) throw new Error("Authentication token is required for admin actions.");
    const response = await api.put(`/admin/users/${id}/role`, { role }, getAuthConfig(token));
    return response.data; // Expects { user: {...} }
  },

  /**
   * Get system statistics (admin only)
   * @param {string} token - Clerk JWT token
   * @returns {Promise<Object>} System statistics
   */
  getStats: async (token) => {
     if (!token) throw new Error("Authentication token is required for admin actions.");
    const response = await api.get('/admin/stats', getAuthConfig(token));
    return response.data;
  },
};

// Export the API instance for custom requests
export default api;