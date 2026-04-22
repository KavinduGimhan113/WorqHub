<<<<<<< Updated upstream
/**
 * Express app: middleware and routes.
 * Multi-tenant SaaS — tenantId from JWT, strict isolation in all tenant-scoped routes.
 */
const express = require('express');
const cors = require('cors');
const { corsOrigin } = require('./config/env');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://worq-hub.vercel.app',
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Disposition'],
  credentials: true,
}));
app.options(/.*/, cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/api/v1', routes);

app.get('/health', (req, res) => res.json({ ok: true }));

app.use(errorHandler);

module.exports = app;
=======
/**
 * Express app: middleware and routes.
 * Multi-tenant SaaS — tenantId from JWT, strict isolation in all tenant-scoped routes.
 */
const express = require('express');
const cors = require('cors');
const { corsOrigin } = require('./config/env');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/api/v1', routes);

app.get('/health', (req, res) => res.json({ ok: true }));

app.use(errorHandler);

module.exports = app;
>>>>>>> Stashed changes
