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
    timestamp: new Date().toISOString()
  });
});

// Aircall Webhook Endpoint
app.post('/webhook/aircall', async (req, res) => {
  try {
    // Validate the webhook
    if (!aircallWebhook.validateWebhook(req)) {
      logger.warn('Invalid webhook received', { body: req.body });
      return res.status(400).send('Bad Request');
    }

    // Process the webhook asynchronously
    aircallWebhook.handleCallEvent(req.body)
      .then(() => logger.info('Webhook processed successfully'))
      .catch(error => logger.error('Async webhook processing error', error));

    res.status(200).send('Webhook received');
  } catch (error) {
    logger.error('Webhook handler error', { error: error.stack });
    res.status(500).send('Internal Server Error');
  }
});

app.get('/test-zoho', async (req, res) => {
  try {
    const result = await zohoApi.createTestLead();
    res.json({ 
      success: true,
      leadId: result.id 
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});
app.get('/test-oggo', async (req, res) => {
  try {
    const phone = '+33123456789';
    
    // 1. Try to find existing contact
    const existing = await oggoApi.searchContactByPhone(phone);
    if (existing.length > 0) {
      return res.json({ 
        status: 'success', 
        action: 'found_existing',
        contact: existing[0] 
      });
    }
    
    // 2. Create new contact if not found
    const newContact = await oggoApi.createContact({
      firstname: 'Test',
      lastname: 'User',
      phones: [phone]
    });
    
    res.json({ 
      status: 'success', 
      action: 'created_new',
      contact: newContact 
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message,
      details: error.response?.data || 'No response details'
    });
  }
});
// Start Server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Aircall webhook URL: ${process.env.SERVER_URL}/webhook/aircall`);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', error);
  // Optionally restart the process
});

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});