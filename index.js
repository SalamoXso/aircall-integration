require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const logger = require('./utils/logger');
const aircallWebhook = require('./lib/aircall-webhook');
const zohoApi = require('./lib/zoho-api');
const oggoApi = require('./lib/oggo-api');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Health Check with Dependency Verification
app.get('/', async (req, res) => {
  const status = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    dependencies: {
      zoho: 'pending',
      oggo: 'pending'
    }
  };

  try {
    await zohoApi.searchContact('+33123456789');
    status.dependencies.zoho = 'healthy';
  } catch (error) {
    status.dependencies.zoho = 'unhealthy';
  }

  try {
    await oggoApi.ping();
    status.dependencies.oggo = 'healthy';
  } catch (error) {
    status.dependencies.oggo = 'unhealthy';
  }

  res.status(200).json(status);
});

// Webhook Endpoints
app.post('/webhook/aircall', async (req, res) => {
  try {
    logger.info('Aircall webhook received', { event: req.body.event });
    
    // Immediate response, process async
    res.status(202).send('Processing');
    
    await aircallWebhook.handleCallEvent(req.body);
  } catch (error) {
    logger.error('Webhook processing failed', { 
      error: error.message,
      stack: error.stack,
      body: req.body 
    });
  }
});

// Test Endpoints
app.get('/test/zoho', async (req, res) => {
  try {
    const result = await zohoApi.createTestLead();
    res.json({ 
      success: true,
      leadId: result.data[0].details.id,
      message: 'Test lead created successfully'
    });
  } catch (error) {
    logger.error('Zoho test failed', error);
    res.status(500).json({
      success: false,
      error: error.response?.data || error.message
    });
  }
});

app.get('/test/oggo', async (req, res) => {
  try {
    const testPhone = '+33756282724';
    const contact = await oggoApi.findOrCreateContact({
      phone: testPhone,
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User'
    });
    
    res.json({
      success: true,
      contact
    });
  } catch (error) {
    logger.error('OGGO test failed', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Graceful Shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Webhook URL: ${process.env.SERVER_URL}/webhook/aircall`);
  
  // Warm up connections
  zohoApi.createTestLead().catch(() => {});
  oggoApi.ping().catch(() => {});
});