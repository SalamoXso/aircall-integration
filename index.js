require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const logger = require('./utils/logger');
const aircallWebhook = require('./lib/aircall-webhook');
const zohoApi = require('./lib/zoho-api');
const oggoApi = require('./lib/oggo-api');
const oggo = require('./lib/oggo-api');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use((req, res, next) => {
  logger.info(`Incoming ${req.method} ${req.path}`);
  next();
});
oggo.createProject('health', sampleData)
  .then(console.log)
  .catch(console.error);
// Health Check
app.get('/', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      zoho: 'unknown',
      oggo: 'unknown',
      webhook: 'active'
    }
  };

  try {
    await zohoApi.searchContact('+33123456789');
    health.services.zoho = 'healthy';
  } catch (error) {
    health.services.zoho = 'unhealthy';
  }

  try {
    await oggoApi.ping();
    health.services.oggo = 'healthy';
  } catch (error) {
    health.services.oggo = 'unhealthy';
  }

  res.status(200).json(health);
});

// Webhook Endpoint
app.post('/webhook/aircall', async (req, res) => {
  try {
    // Immediate response
    res.status(202).json({ status: 'processing' });

    // Process async
    await aircallWebhook.handleCallEvent(req.body);
  } catch (error) {
    logger.error('Webhook processing error', {
      error: error.message,
      stack: error.stack,
      body: req.body
    });
  }
});

// Test Endpoints
app.get('/test/zoho', async (req, res) => {
  try {
    const lead = await zohoApi.createTestLead();
    res.json({
      success: true,
      leadId: lead.data[0].details.id,
      tokenExpires: new Date(zohoApi.tokenCache.expiresAt).toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});



// Error Handling
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    url: req.originalUrl
  });
  res.status(500).json({ error: 'Internal server error' });
});

// Server Start
const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Aircall Webhook URL: ${process.env.SERVER_URL}/webhook/aircall`);
  
  // Warm up connections
  zohoApi.createTestLead().catch(() => {});
  oggoApi.ping().catch(() => {});
});

// Graceful Shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received - shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});