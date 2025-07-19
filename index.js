require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const logger = require('./utils/logger');
const aircallWebhook = require('./lib/aircall-webhook');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());

// Health Check Endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    endpoints: {
      aircallWebhook: '/webhook/aircall',
      testZoho: '/test/zoho',
      testOggo: '/test/oggo'
    }
  });
});

// Aircall Webhook Endpoint
app.post('/webhook/aircall', async (req, res) => {
  try {
    logger.info('Received Aircall webhook', { event: req.body.event });

    // Process the webhook asynchronously
    aircallWebhook.handleCallEvent(req.body)
      .then(() => logger.info('Webhook processed successfully'))
      .catch(error => logger.error('Async webhook processing error', error));

    res.status(200).send('OK');
  } catch (error) {
    logger.error('Webhook handler error', { error });
    res.status(500).json({
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Test OGGO endpoint
app.get('/test/oggo', async (req, res) => {
  try {
    const testPhone = '+33756282724'; // Your test number
    const existing = await aircallWebhook.oggoApi.searchContact(testPhone);
    
    if (existing) {
      return res.json({ 
        status: 'success', 
        action: 'found_existing',
        contact: existing 
      });
    }
    
    const newContact = await aircallWebhook.oggoApi.createContact({
      firstName: 'Test',
      lastName: 'User',
      phone: testPhone,
      email: 'test@example.com'
    });
    
    res.json({ 
      status: 'success', 
      action: 'created_new',
      contact: newContact 
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
});

// Test Zoho endpoint
app.get('/test/zoho', async (req, res) => {
  try {
    const result = await aircallWebhook.zohoApi.createTestLead();
    res.json({ 
      success: true,
      leadId: result.id 
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Start Server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Aircall webhook URL: ${process.env.BASE_URL || `http://localhost:${PORT}`}/webhook/aircall`);
});

// Error handling
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});