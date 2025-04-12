const express = require('express');
const { StatusCodes } = require('http-status-codes');
const { PrismaClient } = require('@prisma/client');
// No need to import 'authenticate' here anymore

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
 *         content:
 *           application/json:
 *             schema:
 *              type: object
 *              properties:
 *                  post:
 *                      $ref: '#/components/schemas/Post' # Define Post schema in swagger
 *       400:
 *         description: Bad request (e.g., missing title or content)
 *       401:
 *         description: Unauthorized (handled by requireAuth middleware)
 *       500:
 *          description: Internal server error
 */
// Use requireAuth + syncUserWithDb from global middleware in index.js
router.post('/', async (req, res) => {
  const { title, content } = req.body;

  // Validate request
  if (!title || !content) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      message: 'Please provide both title and content for the post.', // More specific message
    });
  }

  // req.localUser should be available from syncUserWithDb middleware
  if (!req.localUser || !req.localUser.id) {
      console.error('Error: POST /posts route reached without req.localUser.id populated.');
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Could not identify user to create post.' });
  }

  try {
      const post = await prisma.post.create({
        data: {
          title,
          content,
          userId: req.localUser.id, // Use the ID from the synced local user
        },
        include: { // Optionally include user details in the response
          user: {
            select: { id: true, username: true },
          },
          _count: { // Include counts right away if needed
              select: { comments: true, reviews: true },
          }
        },
      });

      // Optional: Add moderation job for the new post content here if needed
      // await queueService.addModerationJob({ content: post.content, contentId: post.id, contentType: 'POST', userId: req.localUser.id });

      return res.status(StatusCodes.CREATED).json({ post });

  } catch (error) {
      console.error("Error creating post:", error);
      // Handle potential Prisma errors, e.g., database connection issues
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Failed to create post.' });
  }
});

// --- GET All Posts ---
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
// Uses withAuth + syncUserWithDb from global middleware
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
            user: { select: { id: true, username: true, clerkId: true } }, 
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
      console.error("Error fetching posts:", error);
      if (error instanceof Prisma.PrismaClientValidationError) {
        console.error("Prisma Validation Error:", error.message);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Internal server error processing request.' }); 
    }}
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Failed to retrieve posts.' });
});

// --- GET Post by ID ---
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
// Uses withAuth + syncUserWithDb from global middleware
router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;

      const post = await prisma.post.findUnique({
        where: { id },
        include: {
          user: { select: { id: true, username: true, clerkId: true } },
          // Include comments/reviews with necessary details
          comments: {
            include: {
              user: { select: { id: true, username: true, clerkId: true } },
              flaggedContent: true, // Include flagging status
            },
            orderBy: { createdAt: 'desc' },
          },
          reviews: {
            include: {
              user: { select: { id: true, username: true, clerkId: true } },
              flaggedContent: true, // Include flagging status
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
      console.error(`Error fetching post ${req.params.id}:`, error);
       // Handle potential Prisma errors (e.g., invalid UUID format)
      if (error.code === 'P2023' || error.message.includes('Malformed UUID')) {
           return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Invalid Post ID format.' });
      }
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Failed to retrieve post details.' });
    }
});

// --- PUT Update Post ---
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
 *       400:
 *         description: Bad request (e.g., no fields to update)
 *       401:
 *         description: Unauthorized (handled by requireAuth middleware)
 *       403:
 *         description: Forbidden (user doesn't own post)
 *       404:
 *         description: Post not found
 */
 // Uses requireAuth + syncUserWithDb from global middleware
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { title, content } = req.body;
    const updateData = {};

    if (!req.localUser || !req.localUser.id) {
       console.error('Error: PUT /posts/:id route reached without req.localUser.id populated.');
       return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Could not identify user to update post.' });
    }

    // Add fields to update data only if they are provided and not empty strings
    if (title?.trim()) updateData.title = title.trim();
    if (content?.trim()) updateData.content = content.trim();

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
        return res.status(StatusCodes.BAD_REQUEST).json({ message: 'No fields provided to update.' });
    }

    try {
        // Check if post exists first
        const post = await prisma.post.findUnique({
            where: { id },
            select: { userId: true } // Only select userId for ownership check
        });

        if (!post) {
            return res.status(StatusCodes.NOT_FOUND).json({ message: 'Post not found' });
        }

        // Check ownership
        if (post.userId !== req.localUser.id) {
            return res.status(StatusCodes.FORBIDDEN).json({ message: 'You are not authorized to update this post' });
        }

        // Update post
        const updatedPost = await prisma.post.update({
            where: { id },
            data: updateData,
             include: { // Include user data in the response
                user: {
                    select: { id: true, username: true },
                },
                 _count: {
                    select: { comments: true, reviews: true },
                 }
            },
        });

        // Optional: Add moderation job if content was updated
        // if (updateData.content) {
        //   await queueService.addModerationJob({ content: updatedPost.content, ... });
        // }

        return res.status(StatusCodes.OK).json({ post: updatedPost });

    } catch (error) {
        console.error(`Error updating post ${id}:`, error);
        if (error.code === 'P2023' || error.message.includes('Malformed UUID')) {
           return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Invalid Post ID format.' });
        }
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Failed to update post.' });
    }
});

// --- DELETE Post ---
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
 *         description: Unauthorized (handled by requireAuth middleware)
 *       403:
 *         description: Forbidden (user doesn't own post)
 *       404:
 *         description: Post not found
 */
 // Uses requireAuth + syncUserWithDb from global middleware
router.delete('/:id', async (req, res) => {
    const { id } = req.params;

     if (!req.localUser || !req.localUser.id) {
       console.error('Error: DELETE /posts/:id route reached without req.localUser.id populated.');
       return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Could not identify user to delete post.' });
    }

    try {
        // Check if post exists first
        const post = await prisma.post.findUnique({
            where: { id },
            select: { userId: true } // Only select userId for ownership check
        });

        if (!post) {
            return res.status(StatusCodes.NOT_FOUND).json({ message: 'Post not found' });
        }

        // Check ownership
        if (post.userId !== req.localUser.id) {
            // Optional: Allow admins to delete any post
            // if (req.localUser.role !== 'ADMIN') {
                 return res.status(StatusCodes.FORBIDDEN).json({ message: 'You are not authorized to delete this post' });
            // }
        }

        // Delete post (Prisma handles cascading deletes based on schema)
        await prisma.post.delete({
            where: { id },
        });

        return res.status(StatusCodes.OK).json({ message: 'Post deleted successfully' });

    } catch (error) {
        console.error(`Error deleting post ${id}:`, error);
         if (error.code === 'P2023' || error.message.includes('Malformed UUID')) {
           return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Invalid Post ID format.' });
        }
        // Handle case where post might not exist due to race condition (P2025)
        if (error.code === 'P2025') {
             return res.status(StatusCodes.NOT_FOUND).json({ message: 'Post not found' });
        }
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Failed to delete post.' });
    }
});


// --- GET User Posts ---
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
 *         description: User ID (local database ID)
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
 *       404:
 *          description: User not found
 */
// Uses withAuth + syncUserWithDb from global middleware
router.get('/user/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      // Check if user exists before fetching posts
      const userExists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
      if (!userExists) {
          return res.status(StatusCodes.NOT_FOUND).json({ message: 'User not found.' });
      }

      const [posts, total] = await Promise.all([
        prisma.post.findMany({
          where: { userId },
          include: {
            user: { select: { id: true, username: true, clerkId: true} },
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
      console.error(`Error fetching posts for user ${req.params.userId}:`, error);
      if (error.code === 'P2023' || error.message.includes('Malformed UUID')) {
           return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Invalid User ID format.' });
      }
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Failed to retrieve user posts.' });
    }
});


module.exports = router;