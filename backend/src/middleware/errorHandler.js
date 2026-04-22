<<<<<<< Updated upstream
/**
 * Central error handler. Sends consistent JSON error response.
 */
const { nodeEnv } = require('../config/env');

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';

  // Mongoose validation (e.g. required fields)
  if (err.name === 'ValidationError' && err.errors) {
    statusCode = 400;
    const first = Object.values(err.errors)[0];
    message = first?.message || message;
  }
  if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid id or data format';
  }
  // Mongo/Atlas connectivity and TLS handshake failures
  if (
    err.name === 'MongoServerSelectionError' ||
    err.name === 'MongoNetworkError' ||
    String(err.code || '').includes('ERR_SSL') ||
    String(err.message || '').toLowerCase().includes('tlsv1 alert internal error')
  ) {
    statusCode = 503;
    message =
      'Database connection issue. Check MongoDB Atlas network/TLS settings and try again.';
  }

  if (nodeEnv === 'development') {
    console.error(err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(nodeEnv === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;
=======
/**
 * Central error handler. Sends consistent JSON error response.
 */
const { nodeEnv } = require('../config/env');

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  if (nodeEnv === 'development') {
    console.error(err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(nodeEnv === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;
>>>>>>> Stashed changes
