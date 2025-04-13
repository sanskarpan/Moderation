const language = require('@google-cloud/language');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const client = new language.LanguageServiceClient();

/**
 * Moderate text using Google Cloud NLP API
 * @param {string} text - The text to moderate
 * @returns {Promise<Object>} - Moderation result or specific info object
 */
const moderateText = async (text) => {
  // Basic check for empty/very short text *before* calling API
  if (!text || text.trim().length < 5) { // Adjust minimum length as needed (e.g., 5 chars)
      console.log("Skipping moderation for very short text:", text);
      return {
          isToxic: false, // Assume not toxic if too short
          toxicityReason: 'Text too short for analysis',
          sentiment: { score: 0, magnitude: 0 }, // Neutral sentiment
          entities: [],
          categories: [],
          skipped: true // Add a flag indicating it was skipped
      };
  }

  try {
    const document = {
      content: text,
      type: 'PLAIN_TEXT',
    };

    // Use Promise.allSettled to handle potential errors from individual API calls more gracefully
    const results = await Promise.allSettled([
      client.analyzeSentiment({ document }),
      client.analyzeEntitySentiment({ document }),
      client.classifyText({ document }),
    ]);

    // Process results, checking for errors
    const sentimentResult = results[0].status === 'fulfilled' ? results[0].value[0] : null;
    const entityResult = results[1].status === 'fulfilled' ? results[1].value[0] : null;
    const classificationResult = results[2].status === 'fulfilled' ? results[2].value[0] : null;

    // Handle potential individual API call errors if needed (e.g., log them)
    results.forEach((result, index) => {
       if (result.status === 'rejected') {
           // Check specifically for the "too few tokens" error from Google
           if (result.reason?.code === 3 && result.reason?.details?.includes('too few tokens')) {
               console.warn(`Google NLP API call ${index} failed (Too few tokens):`, text);
               // Don't treat this specific error as fatal for the whole moderation check
           } else {
               // Log other unexpected API errors
               console.error(`Google NLP API call ${index} failed:`, result.reason);
           }
       }
    });

    // Proceed with analysis using available results
    const sentiment = sentimentResult?.documentSentiment || { score: 0, magnitude: 0 };
    const entities = entityResult?.entities || [];
    const categories = classificationResult?.categories || [];

    // --- Your existing toxicity logic based on sentiment/entities/categories ---
    let isToxic = false;
    let toxicityReason = '';

    if (sentiment.score < -0.7) { /* ... */ isToxic = true; toxicityReason = 'Extremely negative sentiment'; }
    entities.forEach((entity) => { if (entity.sentiment.score < -0.6 /* ... */) { isToxic = true; toxicityReason = `Negative sentiment for ${entity.type}: ${entity.name}`; }});
    const sensitiveCategories = [ /* ... */ ];
    categories.forEach((category) => { if (sensitiveCategories.some(/* ... */) && category.confidence > 0.7) { isToxic = true; toxicityReason = `Sensitive category: ${category.name}`; }});
    // --- End existing logic ---

    return {
      isToxic,
      toxicityReason: isToxic ? toxicityReason : '', // Only provide reason if toxic
      sentiment: {
        score: sentiment.score,
        magnitude: sentiment.magnitude,
      },
      entities: entities.map((entity) => ({ /* ... */ })),
      categories: categories.map((category) => ({ /* ... */ })),
      skipped: false // Indicate analysis was attempted
    };

  } catch (error) {
     // Catch errors during the overall process (like initial client issues)
     // *OR* handle the specific Google error here if Promise.allSettled isn't used
     if (error.code === 3 && error.details?.includes('too few tokens')) {
         console.warn("Moderation failed (Too few tokens):", text);
         // Return a default "not toxic" response for this specific error
         return {
            isToxic: false,
            toxicityReason: 'Text too short for analysis',
            sentiment: { score: 0, magnitude: 0 },
            entities: [],
            categories: [],
            skipped: true
         };
     } else {
         // Log and re-throw other unexpected errors
         console.error('Error moderating text:', error);
         // This will still cause a 500 if it reaches here, which is appropriate for unexpected errors
         throw new Error(`Failed to moderate text: ${error.message}`);
     }
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