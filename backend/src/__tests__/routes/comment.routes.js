const request = require('supertest');
const { app } = require('../../index');
const {
  clearDatabase,
  createTestUser,
  createTestPost,
  createTestComment,
} = require('../helpers/setup');
const { authenticate } = require('../../middleware/auth');

// Mock dependencies
jest.mock('../../middleware/auth', () => ({
  authenticate: jest.fn((req, res, next) => next()),
  authorizeAdmin: jest.fn((req, res, next) => next()),
}));

jest.mock('../../services/queue.service', () => ({
  addModerationJob: jest.fn().mockResolvedValue({}),
}));

describe('Comment Routes', () => {
  let testUser;
  let testPost;

  beforeAll(async () => {
    await clearDatabase();
  });

  beforeEach(async () => {
    // Create test data
    testUser = await createTestUser();
    testPost = await createTestPost(testUser.id);
    
    // Mock authentication
    authenticate.mockImplementation((req, res, next) => {
      req.user = testUser;
      next();
    });
  });

  afterAll(async () => {
    await clearDatabase();
  });

  describe('POST /api/comments', () => {
    it('should create a new comment', async () => {
      const commentData = {
        content: 'This is a test comment',
        postId: testPost.id,
      };

      const response = await request(app)
        .post('/api/comments')
        .send(commentData);

      expect(response.status).toBe(201);
      expect(response.body.comment).toBeDefined();
      expect(response.body.comment.content).toBe(commentData.content);
      expect(response.body.comment.postId).toBe(commentData.postId);
      expect(response.body.comment.userId).toBe(testUser.id);
    });

    it('should return 400 if content is missing', async () => {
      const commentData = {
        postId: testPost.id,
      };

      const response = await request(app)
        .post('/api/comments')
        .send(commentData);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Validation error');
    });

    it('should return 404 if post does not exist', async () => {
      const commentData = {
        content: 'This is a test comment',
        postId: 'non-existent-post-id',
      };

      const response = await request(app)
        .post('/api/comments')
        .send(commentData);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Post not found');
    });
  });

  describe('GET /api/comments', () => {
    beforeEach(async () => {
      // Create some test comments
      await createTestComment(testUser.id, testPost.id, { content: 'Comment 1' });
      await createTestComment(testUser.id, testPost.id, { content: 'Comment 2' });
      await createTestComment(testUser.id, testPost.id, { content: 'Comment 3' });
    });

    it('should return a list of comments', async () => {
      const response = await request(app).get('/api/comments');

      expect(response.status).toBe(200);
      expect(response.body.comments).toBeDefined();
      expect(Array.isArray(response.body.comments)).toBe(true);
      expect(response.body.comments.length).toBeGreaterThan(0);
      expect(response.body.pagination).toBeDefined();
    });

    it('should filter comments by postId', async () => {
      const response = await request(app)
        .get(`/api/comments?postId=${testPost.id}`);

      expect(response.status).toBe(200);
      expect(response.body.comments).toBeDefined();
      expect(Array.isArray(response.body.comments)).toBe(true);
      expect(response.body.comments.length).toBeGreaterThan(0);
      expect(response.body.comments[0].postId).toBe(testPost.id);
    });

    it('should paginate results', async () => {
      const page = 1;
      const limit = 2;

      const response = await request(app)
        .get(`/api/comments?page=${page}&limit=${limit}`);

      expect(response.status).toBe(200);
      expect(response.body.comments).toBeDefined();
      expect(Array.isArray(response.body.comments)).toBe(true);
      expect(response.body.comments.length).toBeLessThanOrEqual(limit);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.page).toBe(page);
      expect(response.body.pagination.limit).toBe(limit);
    });
  });

  describe('GET /api/comments/:id', () => {
    let testComment;

    beforeEach(async () => {
      testComment = await createTestComment(testUser.id, testPost.id);
    });

    it('should return a comment by ID', async () => {
      const response = await request(app).get(`/api/comments/${testComment.id}`);

      expect(response.status).toBe(200);
      expect(response.body.comment).toBeDefined();
      expect(response.body.comment.id).toBe(testComment.id);
      expect(response.body.comment.content).toBe(testComment.content);
      expect(response.body.comment.user).toBeDefined();
      expect(response.body.comment.post).toBeDefined();
    });

    it('should return 404 if comment does not exist', async () => {
      const response = await request(app).get('/api/comments/non-existent-id');

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Comment not found');
    });
  });

  describe('PUT /api/comments/:id', () => {
    let testComment;

    beforeEach(async () => {
      testComment = await createTestComment(testUser.id, testPost.id);
    });

    it('should update a comment', async () => {
      const updatedContent = 'Updated comment content';

      const response = await request(app)
        .put(`/api/comments/${testComment.id}`)
        .send({ content: updatedContent });

      expect(response.status).toBe(200);
      expect(response.body.comment).toBeDefined();
      expect(response.body.comment.id).toBe(testComment.id);
      expect(response.body.comment.content).toBe(updatedContent);
    });

    it('should return 404 if comment does not exist', async () => {
      const response = await request(app)
        .put('/api/comments/non-existent-id')
        .send({ content: 'Updated content' });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Comment not found');
    });

    it('should return 400 if content is empty', async () => {
      const response = await request(app)
        .put(`/api/comments/${testComment.id}`)
        .send({ content: '' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Validation error');
    });

    it('should return 401 if user is not the comment owner', async () => {
      // Create a different user
      const anotherUser = await createTestUser({ 
        username: 'anotheruser', 
        email: 'another@example.com' 
      });
      
      // Mock authentication with the other user
      authenticate.mockImplementationOnce((req, res, next) => {
        req.user = anotherUser;
        next();
      });

      const response = await request(app)
        .put(`/api/comments/${testComment.id}`)
        .send({ content: 'Updated by another user' });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('You are not authorized to update this comment');
    });
  });

  describe('DELETE /api/comments/:id', () => {
    let testComment;

    beforeEach(async () => {
      testComment = await createTestComment(testUser.id, testPost.id);
    });

    it('should delete a comment', async () => {
      const response = await request(app)
        .delete(`/api/comments/${testComment.id}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Comment deleted successfully');

      // Verify the comment is deleted
      const getResponse = await request(app).get(`/api/comments/${testComment.id}`);
      expect(getResponse.status).toBe(404);
    });

    it('should return 404 if comment does not exist', async () => {
      const response = await request(app)
        .delete('/api/comments/non-existent-id');

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Comment not found');
    });

    it('should return 401 if user is not the comment owner', async () => {
      // Create a different user
      const anotherUser = await createTestUser({ 
        username: 'anotheruser2', 
        email: 'another2@example.com' 
      });
      
      // Mock authentication with the other user
      authenticate.mockImplementationOnce((req, res, next) => {
        req.user = anotherUser;
        next();
      });

      const response = await request(app)
        .delete(`/api/comments/${testComment.id}`);

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('You are not authorized to delete this comment');
    });
  });

  describe('GET /api/comments/user/:userId', () => {
    beforeEach(async () => {
      // Create some test comments for the user
      await createTestComment(testUser.id, testPost.id, { content: 'User Comment 1' });
      await createTestComment(testUser.id, testPost.id, { content: 'User Comment 2' });
      
      // Create another user and comments
      const anotherUser = await createTestUser({ 
        username: 'commentuser', 
        email: 'commentuser@example.com' 
      });
      await createTestComment(anotherUser.id, testPost.id, { content: 'Another User Comment' });
    });

    it('should return comments by user ID', async () => {
      const response = await request(app)
        .get(`/api/comments/user/${testUser.id}`);

      expect(response.status).toBe(200);
      expect(response.body.comments).toBeDefined();
      expect(Array.isArray(response.body.comments)).toBe(true);
      expect(response.body.comments.length).toBeGreaterThan(0);
      
      // Verify all comments belong to the specified user
      response.body.comments.forEach(comment => {
        expect(comment.userId).toBe(testUser.id);
      });
    });

    it('should paginate user comments', async () => {
      const page = 1;
      const limit = 1;

      const response = await request(app)
        .get(`/api/comments/user/${testUser.id}?page=${page}&limit=${limit}`);

      expect(response.status).toBe(200);
      expect(response.body.comments).toBeDefined();
      expect(Array.isArray(response.body.comments)).toBe(true);
      expect(response.body.comments.length).toBeLessThanOrEqual(limit);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.page).toBe(page);
      expect(response.body.pagination.limit).toBe(limit);
    });

    it('should return empty array if user has no comments', async () => {
      // Create a user with no comments
      const userWithNoComments = await createTestUser({ 
        username: 'nocomments', 
        email: 'nocomments@example.com' 
      });

      const response = await request(app)
        .get(`/api/comments/user/${userWithNoComments.id}`);

      expect(response.status).toBe(200);
      expect(response.body.comments).toBeDefined();
      expect(Array.isArray(response.body.comments)).toBe(true);
      expect(response.body.comments.length).toBe(0);
    });
  });
});