const express = require('express');
const { StatusCodes } = require('http-status-codes');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * @swagger
 * /posts:
 *   post:
 *     summary: Create a new post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - content
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *     responses:
 *       201:
 *         description: Post created successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post('/', authenticate, async (req, res) => {
  const { title, content } = req.body;
  
  // Validate request
  if (!title || !content) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      message: 'Post not found',
    });
  }

  return res.status(StatusCodes.OK).json({ post });
});

/**
 * @swagger
 * /posts/{id}:
 *   put:
 *     summary: Update a post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Post ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *     responses:
 *       200:
 *         description: Post updated successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Post not found
 */
router.put('/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const { title, content } = req.body;
  const updateData = {};

  // Add fields to update data if provided
  if (title) updateData.title = title;
  if (content) updateData.content = content;

  // Check if post exists and belongs to user
  const post = await prisma.post.findUnique({
    where: { id },
  });

  if (!post) {
    return res.status(StatusCodes.NOT_FOUND).json({
      message: 'Post not found',
    });
  }

  if (post.userId !== req.user.id) {
    return res.status(StatusCodes.UNAUTHORIZED).json({
      message: 'You are not authorized to update this post',
    });
  }

  // Update post
  const updatedPost = await prisma.post.update({
    where: { id },
    data: updateData,
  });

  return res.status(StatusCodes.OK).json({ post: updatedPost });
});

/**
 * @swagger
 * /posts/{id}:
 *   delete:
 *     summary: Delete a post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Post ID
 *     responses:
 *       200:
 *         description: Post deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Post not found
 */
router.delete('/:id', authenticate, async (req, res) => {
  const { id } = req.params;

  // Check if post exists and belongs to user
  const post = await prisma.post.findUnique({
    where: { id },
  });

  if (!post) {
    return res.status(StatusCodes.NOT_FOUND).json({
      message: 'Post not found',
    });
  }

  if (post.userId !== req.user.id) {
    return res.status(StatusCodes.UNAUTHORIZED).json({
      message: 'You are not authorized to delete this post',
    });
  }

  // Delete post (will also delete related comments and reviews due to cascading)
  await prisma.post.delete({
    where: { id },
  });

  return res.status(StatusCodes.OK).json({
    message: 'Post deleted successfully',
  });
});

/**
 * @swagger
 * /posts/user/{userId}:
 *   get:
 *     summary: Get posts by user ID
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: A list of posts by the user
 */
router.get('/user/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;
  
      const [posts, total] = await Promise.all([
        prisma.post.findMany({
          where: { userId },
          include: {
            user: { select: { id: true, username: true } },
            _count: { select: { comments: true, reviews: true } },
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.post.count({ where: { userId } }),
      ]);
  
      return res.status(StatusCodes.OK).json({
        posts,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error(error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Server error' });
    }
  });


/**
 * @swagger
 * /posts:
 *   get:
 *     summary: Get all posts
 *     tags: [Posts]
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter posts by user ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: A list of posts
 */
router.get('/', async (req, res) => {
    try {
      const { userId } = req.query;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;
  
      const where = {};
      if (userId) where.userId = userId;
  
      const [posts, total] = await Promise.all([
        prisma.post.findMany({
          where,
          include: {
            user: { select: { id: true, username: true } },
            _count: { select: { comments: true, reviews: true } },
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.post.count({ where }),
      ]);
  
      return res.status(StatusCodes.OK).json({
        posts,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error(error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Server error' });
    }
  });
  

/**
 * @swagger
 * /posts/{id}:
 *   get:
 *     summary: Get a post by ID
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Post ID
 *     responses:
 *       200:
 *         description: Post details
 *       404:
 *         description: Post not found
 */
router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;
  
      const post = await prisma.post.findUnique({
        where: { id },
        include: {
          user: { select: { id: true, username: true } },
          comments: {
            include: {
              user: { select: { id: true, username: true } },
              flaggedContent: true,
            },
            orderBy: { createdAt: 'desc' },
          },
          reviews: {
            include: {
              user: { select: { id: true, username: true } },
              flaggedContent: true,
            },
            orderBy: { createdAt: 'desc' },
          },
          _count: {
            select: { comments: true, reviews: true },
          },
        },
      });
  
      if (!post) {
        return res.status(StatusCodes.NOT_FOUND).json({ message: 'Post not found' });
      }
  
      return res.status(StatusCodes.OK).json({ post });
    } catch (error) {
      console.error(error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Server error' });
    }
  });
  
  module.exports = router;