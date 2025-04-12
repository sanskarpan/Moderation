const { StatusCodes } = require('http-status-codes');

const errorHandlerMiddleware = (err, req, res, next) => {
  let customError = {
    statusCode: err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR,
    message: err.message || 'Something went wrong, please try again later',
  };

  // Log the error for debugging
  console.error(err);

  // Handle Prisma errors
  if (err.name === 'PrismaClientKnownRequestError') {
    // P2002 is for unique constraint violation
    if (err.code === 'P2002') {
      customError.message = `Duplicate value entered for ${err.meta.target} field`;
      customError.statusCode = StatusCodes.CONFLICT;
    }
    // P2025 is for record not found
    if (err.code === 'P2025') {
      customError.message = 'Resource not found';
      customError.statusCode = StatusCodes.NOT_FOUND;
    }
  }

  // Handle validation errors
  if (err.name === 'ValidationError') {
    customError.message = Object.values(err.errors)
      .map((item) => item.message)
      .join(', ');
    customError.statusCode = StatusCodes.BAD_REQUEST;
  }

  // Handle Clerk errors
  if (err.name === 'ClerkAPIResponseError') {
    customError.message = err.message;
    customError.statusCode = StatusCodes.BAD_REQUEST;
  }

  return res.status(customError.statusCode).json({ message: customError.message });
};

module.exports = errorHandlerMiddleware;