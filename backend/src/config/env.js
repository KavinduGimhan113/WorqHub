<<<<<<< Updated upstream
/**
 * Environment validation and exports.
 * Use .env for local; never commit secrets.
 */
require('dotenv').config();

const nodeEnv = process.env.NODE_ENV || 'development';
const defaultJwt =
  nodeEnv === 'development' ? 'worqhub-dev-secret-change-in-production' : '';

const required = ['NODE_ENV', 'PORT', 'JWT_SECRET', 'MONGO_URI'];
const missing = required.filter((key) => !process.env[key]);

if (missing.length) {
  console.warn(
    `Missing env: ${missing.join(', ')}. Using defaults where possible. Create .env from .env.example.`
  );
}
if (nodeEnv === 'development' && !process.env.JWT_SECRET) {
  console.warn('Using default JWT_SECRET in development. Set JWT_SECRET in .env for production.');
}

module.exports = {
  nodeEnv,
  port: parseInt(process.env.PORT || '5000', 10),
  jwtSecret: process.env.JWT_SECRET || defaultJwt,
  mongoUri: process.env.MONGO_URI || process.env.MONGODB_URI || '',
  corsOrigin: process.env.CORS_ORIGIN || 'https://worq-hub.vercel.app',
};
=======
/**
 * Environment validation and exports.
 * Use .env for local; never commit secrets.
 */
require('dotenv').config();

const nodeEnv = process.env.NODE_ENV || 'development';
const defaultJwt =
  nodeEnv === 'development' ? 'worqhub-dev-secret-change-in-production' : '';

const required = ['NODE_ENV', 'PORT', 'JWT_SECRET', 'MONGO_URI'];
const missing = required.filter((key) => !process.env[key]);

if (missing.length) {
  console.warn(
    `Missing env: ${missing.join(', ')}. Using defaults where possible. Create .env from .env.example.`
  );
}
if (nodeEnv === 'development' && !process.env.JWT_SECRET) {
  console.warn('Using default JWT_SECRET in development. Set JWT_SECRET in .env for production.');
}

module.exports = {
  nodeEnv,
  port: parseInt(process.env.PORT || '5000', 10),
  jwtSecret: process.env.JWT_SECRET || defaultJwt,
  mongoUri: process.env.MONGO_URI || process.env.MONGODB_URI || '',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
};
>>>>>>> Stashed changes
