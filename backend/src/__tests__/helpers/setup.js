const { PrismaClient } = require('@prisma/client');
const request = require('supertest');
const { app } = require('../../index');

// Create a test client
const prisma = new PrismaClient();
const testClient = request(app);

/**
 * Clear the test database
 */
const clearDatabase = async () => {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('clearDatabase should only be run in test environment');
  }

  await prisma.flaggedContent.deleteMany({});
  await prisma.comment.deleteMany({});
  await prisma.review.deleteMany({});
  await prisma.post.deleteMany({});
  await prisma.user.deleteMany({});
};

/**
 * Create a test user
 * @param {Object} userData - User data
 * @returns {Promise<Object>} Created user
 */
const createTestUser = async (userData = {}) => {
  return prisma.user.create({
    data: {
      clerkId: userData.clerkId || `test-clerk-${Date.now()}`,
      email: userData.email || `test-${Date.now()}@example.com`,
      username: userData.username || `testuser-${Date.now()}`,
      role: userData.role || 'USER',
      emailNotification: userData.emailNotification ?? true,
    },
  });
};

/**
 * Create a test admin user
 * @returns {Promise<Object>} Created admin user
 */
const createTestAdmin = async () => {
  return createTestUser({ role: 'ADMIN' });
};

/**
 * Create a test post
 * @param {string} userId - User ID
 * @param {Object} postData - Post data
 * @returns {Promise<Object>} Created post
 */
const createTestPost = async (userId, postData = {}) => {
  return prisma.post.create({
    data: {
      title: postData.title || `Test Post ${Date.now()}`,
      content: postData.content || 'This is a test post content.',
      userId,
    },
  });
};

/**
 * Create a test comment
 * @param {string} userId - User ID
 * @param {string} postId - Post ID
 * @param {Object} commentData - Comment data
 * @returns {Promise<Object>} Created comment
 */
const createTestComment = async (userId, postId, commentData = {}) => {
  return prisma.comment.create({
    data: {
      content: commentData.content || 'This is a test comment.',
      userId,
      postId,
    },
  });
};

/**
 * Create a test review
 * @param {string} userId - User ID
 * @param {string} postId - Post ID
 * @param {Object} reviewData - Review data
 * @returns {Promise<Object>} Created review
 */
const createTestReview = async (userId, postId, reviewData = {}) => {
  return prisma.review.create({
    data: {
      content: reviewData.content || 'This is a test review.',
      rating: reviewData.rating || 4,
      userId,
      postId,
    },
  });
};

/**
 * Create a test flagged content
 * @param {Object} flaggedData - Flagged content data
 * @returns {Promise<Object>} Created flagged content
 */
const createTestFlaggedContent = async (flaggedData) => {
  return prisma.flaggedContent.create({
    data: {
      contentId: flaggedData.contentId,
      type: flaggedData.type,
      reason: flaggedData.reason || 'Test flagging reason',
      userId: flaggedData.userId,
      commentId: flaggedData.type === 'COMMENT' ? flaggedData.contentId : undefined,
      reviewId: flaggedData.type === 'REVIEW' ? flaggedData.contentId : undefined,
      status: flaggedData.status || 'PENDING',
    },
  });
};

/**
 * Mock authentication for tests
 * @param {Object} user - User object to mock
 * @returns {Function} Express middleware function
 */
const mockAuth = (user) => {
  return (req, res, next) => {
    req.user = user;
    next();
  };
};

/**
 * Get an auth header for testing
 * @param {string} token - Auth token
 * @returns {Object} Headers object
 */
const getAuthHeader = (token) => {
  return {
    Authorization: `Bearer ${token}`,
  };
};

module.exports = {
  prisma,
  testClient,
  clearDatabase,
  createTestUser,
  createTestAdmin,
  createTestPost,
  createTestComment,
  createTestReview,
  createTestFlaggedContent,
  mockAuth,
  getAuthHeader,
};