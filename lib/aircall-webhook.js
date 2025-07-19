const OGGOApi = require('./oggo-api');
const ZohoApi = require('./zoho-api');
const { CALL_TYPES, CALL_STATUSES } = require('../config/constants');
const logger = require('../utils/logger');

class AircallWebhook {
  constructor() {
    // Initialize APIs with environment variables
    this.oggoApi = new OGGOApi(
      process.env.OGGO_CONSUMER_KEY,
      process.env.OGGO_CONSUMER_SECRET
    );
    
    // Properly initialize ZohoApi with required parameters
    this.zohoApi = new ZohoApi(
      process.env.ZOHO_CLIENT_ID,
      process.env.ZOHO_CLIENT_SECRET,
      process.env.ZOHO_REFRESH_TOKEN
    );
  }

  async handleCallEvent(callData) {
    try {
      logger.info('Processing Aircall webhook', { event: callData.event });

      // Extract caller information
      const callerNumber = callData.direction === 'inbound' 
        ? callData.from 
        : callData.to;
      
      const contactData = {
        phone: callerNumber,
        firstName: callData.contact?.name?.split(' ')[0] || 'Unknown',
        lastName: callData.contact?.name?.split(' ').slice(1).join(' ') || 'Caller',
        email: callData.contact?.email || '',
        company: callData.contact?.company || ''
      };

      // Check if contact exists in OGGO
      let contact = await this.oggoApi.searchContact(callerNumber);
      
      if (!contact) {
        // Create new contact in OGGO
        contact = await this.oggoApi.createContact(contactData);
        logger.info('Created new contact in OGGO', { contact });
      }

      // Create auto project in OGGO
      const project = await this.oggoApi.createAutoProject(contactData, {
        direction: callData.direction,
        duration: callData.duration,
        notes: callData.notes || ''
      });
      logger.info('Created auto project in OGGO', { project });

      // Sync with Zoho CRM
      await this.zohoApi.syncCallData({
        callType: CALL_TYPES[callData.direction.toUpperCase()],
        callStatus: callData.status === 'answered' 
          ? CALL_STATUSES.ANSWERED 
          : CALL_STATUSES.NOT_ANSWERED,
        duration: callData.duration,
        date: new Date(callData.started_at * 1000).toISOString(),
        recordingUrl: callData.recording_url,
        callerNumber: callData.from,
        recipientNumber: callData.to,
        notes: callData.notes,
        tags: callData.tags,
        contactId: contact.uuid
      });

      return { success: true, contact, project };
    } catch (error) {
      logger.error('Error processing Aircall webhook', { error });
      throw error;
    }
  }
}

// Export an instance of the class
module.exports = new AircallWebhook();