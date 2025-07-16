const logger = require('./logger');

module.exports = {
  formatPhoneNumber: (phone) => {
    // Remove all non-digit characters
    return phone.replace(/\D/g, '');
  },
  
  handleError: (error, context = '') => {
    logger.error(`${context} - ${error.message}`, {
      error: error.stack,
      timestamp: new Date().toISOString()
    });
    
    // You can add notification logic here (email, Slack, etc.)
  },
  
  validateWebhook: (req) => {
    // Implement validation logic for Aircall webhooks if needed
    return true;
  }
};