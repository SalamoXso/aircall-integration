require('dotenv').config();
const zohoApi = require('./lib/zoho-api');
const oggoApi = require('./lib/oggo-api');
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
      testOggo: '/test/oggo',
      searchContact: '/contact/search?phone=+33123456789'
    }
  });
});

// Aircall Webhook Endpoint - Updated version
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

// Test Zoho endpoint
app.get('/test/zoho', async (req, res) => {
  try {
    const result = await zohoApi.createTestLead();
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

// Test OGGO endpoint - Correct path
app.get('/test/oggo', async (req, res) => {
  try {
    const testPhone = '+33756282724'; // Your test number
    const existing = await oggoApi.searchContact(testPhone);
    
    if (existing) {
      return res.json({ 
        status: 'success', 
        action: 'found_existing',
        contact: existing 
      });
    }
    
    const newContact = await oggoApi.createContact({
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

// Search contact endpoint
app.get('/contact/search', async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    const contact = await oggoApi.searchContact(phone);
    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    res.json(contact);
  } catch (error) {
    res.status(500).json({
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Start Server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Aircall webhook URL: ${process.env.BASE_URL || `http://localhost:${PORT}`}/webhook/aircall`);
  logger.info(`Test endpoints:
  - OGGO: ${process.env.BASE_URL || `http://localhost:${PORT}`}/test/oggo
  - Zoho: ${process.env.BASE_URL || `http://localhost:${PORT}`}/test/zoho`);
});

// Error handling
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});