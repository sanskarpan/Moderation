const language = require('@google-cloud/language');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const client = new language.LanguageServiceClient();

/**
 * Moderate text using Google Cloud NLP API
 * @param {string} text - The text to moderate
 * @returns {Promise<Object>} - Moderation result
 */
const moderateText = async (text) => {
  try {
    const document = {
      content: text,
      type: 'PLAIN_TEXT',
    };

    // Analyze sentiment
    const [sentimentResult] = await client.analyzeSentiment({ document });
    const sentiment = sentimentResult.documentSentiment;

    // Analyze entity sentiment
    const [entityResult] = await client.analyzeEntitySentiment({ document });
    const entities = entityResult.entities;

    // Analyze content categories
    const [classificationResult] = await client.classifyText({ document });
    const categories = classificationResult.categories;

    // Analyze toxicity
    // Note: Google Cloud NLP doesn't have a direct toxicity API
    // Using sentiment and entity sentiment as a proxy
    let isToxic = false;
    let toxicityReason = '';

    // If overall sentiment is very negative, flag as potentially toxic
    if (sentiment.score < -0.7) {
      isToxic = true;
      toxicityReason = 'Extremely negative sentiment detected';
    }

    // Check for negative sentiment associated with sensitive entity types
    entities.forEach((entity) => {
      if (
        entity.sentiment.score < -0.6
        && (
          entity.type === 'PERSON'
          || entity.type === 'ORGANIZATION'
          || entity.type === 'LOCATION'
          || entity.type === 'OTHER'
        )
      ) {
        isToxic = true;
        toxicityReason = `Negative sentiment associated with ${entity.type.toLowerCase()}: ${entity.name}`;
      }
    });

    // Check for sensitive categories
    const sensitiveCategories = [
      '/Adult',
      '/Sensitive Subjects',
      '/Offensive',
      '/Hate',
      '/Violence',
    ];

    categories.forEach((category) => {
      if (sensitiveCategories.some((cat) => category.name.includes(cat)) && category.confidence > 0.7) {
        isToxic = true;
        toxicityReason = `Sensitive content category detected: ${category.name}`;
      }
    });

    return {
      isToxic,
      toxicityReason,
      sentiment: {
        score: sentiment.score,
        magnitude: sentiment.magnitude,
      },
      entities: entities.map((entity) => ({
        name: entity.name,
        type: entity.type,
        sentiment: entity.sentiment,
      })),
      categories: categories.map((category) => ({
        name: category.name,
        confidence: category.confidence,
      })),
    };
  } catch (error) {
    console.error('Error moderating text:', error);
    throw new Error(`Failed to moderate text: ${error.message}`);
  }
};

/**
 * Create a flagged content record
 * @param {Object} data - Flagged content data
 * @returns {Promise<Object>} - Created flagged content
 */
const createFlaggedContent = async ({
  contentId, contentType, userId, reason, commentId, reviewId,
}) => {
  try {
    return await prisma.flaggedContent.create({
      data: {
        contentId,
        type: contentType,
        userId,
        reason,
        commentId,
        reviewId,
      },
      include: {
        user: true,
        comment: true,
        review: true,
      },
    });
  } catch (error) {
    console.error('Error creating flagged content:', error);
    throw new Error(`Failed to create flagged content: ${error.message}`);
  }
};

/**
 * Get all flagged content
 * @param {Object} query - Query parameters
 * @returns {Promise<Array>} - List of flagged content
 */
const getFlaggedContent = async (query = {}) => {
  const {
    status, userId, page = 1, limit = 10, type,
  } = query;

  const skip = (page - 1) * limit;
  const where = {};

  if (status) {
    where.status = status;
  }

  if (userId) {
    where.userId = userId;
  }

  if (type) {
    where.type = type;
  }

  try {
    const [flaggedContent, total] = await Promise.all([
      prisma.flaggedContent.findMany({
        where,
        include: {
          user: true,
          comment: true,
          review: true,
        },
        skip,
        take: Number(limit),
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.flaggedContent.count({ where }),
    ]);

    return {
      flaggedContent,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error('Error fetching flagged content:', error);
    throw new Error(`Failed to fetch flagged content: ${error.message}`);
  }
};

/**
 * Update flagged content status
 * @param {string} id - Flagged content ID
 * @param {string} status - New status
 * @returns {Promise<Object>} - Updated flagged content
 */
const updateFlaggedContentStatus = async (id, status) => {
  try {
    return await prisma.flaggedContent.update({
      where: { id },
      data: { status },
      include: {
        user: true,
        comment: true,
        review: true,
      },
    });
  } catch (error) {
    console.error('Error updating flagged content status:', error);
    throw new Error(`Failed to update flagged content status: ${error.message}`);
  }
};

module.exports = {
  moderateText,
  createFlaggedContent,
  getFlaggedContent,
  updateFlaggedContentStatus,
};