const Joi = require('joi');
const { StatusCodes } = require('http-status-codes');

/**
 * Generic validation middleware creator
 * @param {Joi.Schema} schema - Joi validation schema
 * @param {string} property - Request property to validate (body, query, params)
 * @returns {function} Express middleware function
 */
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (!error) {
      return next();
    }

    const errors = error.details.map((detail) => ({
      path: detail.path.join('.'),
      message: detail.message,
    }));

    return res.status(StatusCodes.BAD_REQUEST).json({
      message: 'Validation error',
      errors,
    });
  };
};

// Post validation schemas
const createPostSchema = Joi.object({
  title: Joi.string().required().trim().min(3).max(150),
  content: Joi.string().required().trim().min(10).max(10000),
});

const updatePostSchema = Joi.object({
  title: Joi.string().trim().min(3).max(150),
  content: Joi.string().trim().min(10).max(10000),
}).min(1);

// Comment validation schemas
const createCommentSchema = Joi.object({
  content: Joi.string().required().trim().min(1).max(1000),
  postId: Joi.string().required().trim(),
});

const updateCommentSchema = Joi.object({
  content: Joi.string().required().trim().min(1).max(1000),
});

// Review validation schemas
const createReviewSchema = Joi.object({
  content: Joi.string().required().trim().min(1).max(1000),
  rating: Joi.number().required().integer().min(1).max(5),
  postId: Joi.string().required().trim(),
});

const updateReviewSchema = Joi.object({
  content: Joi.string().trim().min(1).max(1000),
  rating: Joi.number().integer().min(1).max(5),
}).min(1);

// Moderation validation schemas
const moderationCheckSchema = Joi.object({
  content: Joi.string().required().trim().min(1).max(10000),
});

const updatePreferencesSchema = Joi.object({
  emailNotification: Joi.boolean().required(),
});

// Admin validation schemas
const updateUserRoleSchema = Joi.object({
  role: Joi.string().required().valid('USER', 'ADMIN'),
});

const rejectFlaggedContentSchema = Joi.object({
  reason: Joi.string().trim().min(1).max(500),
});

// Pagination validation schema
const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
});

// Filter schemas
const flaggedContentFilterSchema = Joi.object({
  status: Joi.string().valid('PENDING', 'APPROVED', 'REJECTED'),
  type: Joi.string().valid('COMMENT', 'REVIEW'),
  userId: Joi.string(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
});

module.exports = {
  validate,
  createPostSchema,
  updatePostSchema,
  createCommentSchema,
  updateCommentSchema,
  createReviewSchema,
  updateReviewSchema,
  moderationCheckSchema,
  updatePreferencesSchema,
  updateUserRoleSchema,
  rejectFlaggedContentSchema,
  paginationSchema,
  flaggedContentFilterSchema,
};