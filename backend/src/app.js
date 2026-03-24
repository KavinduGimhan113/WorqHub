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
    "http://localhost:3000",
    "https://worq-hub.vercel.app"
  ],
  methods: ["GET","POST","PUT","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization"],
  credentials: true
}));
app.options(/.*/, cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/api/v1', routes);

app.get('/health', (req, res) => res.json({ ok: true }));

app.use(errorHandler);

module.exports = app;
