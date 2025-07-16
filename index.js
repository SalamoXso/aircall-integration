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
    // Validate the webhook if needed
    if (!aircallWebhook.validateWebhook(req)) {
      return res.status(403).send('Forbidden');
    }

    // Process the webhook asynchronously
    aircallWebhook.handleCallEvent(req.body)
      .catch(error => {
        logger.error('Async webhook processing error', error);
      });

    // Respond immediately to Aircall
    res.status(200).send('Webhook received');
  } catch (error) {
    logger.error('Webhook handler error', error);
    res.status(500).send('Internal Server Error');
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