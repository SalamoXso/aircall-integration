const OGGOApi = require('./oggo-api');
const ZohoApi = require('./zoho-api');
const { CALL_TYPES, CALL_STATUSES } = require('../config/constants');
const logger = require('../utils/logger');

class AircallWebhook {
  constructor() {
    this.oggoApi = new OGGOApi(
      process.env.OGGO_CONSUMER_KEY,
      process.env.OGGO_CONSUMER_SECRET
    );
    this.zohoApi = new ZohoApi(
      process.env.ZOHO_CLIENT_ID,
      process.env.ZOHO_CLIENT_SECRET,
      process.env.ZOHO_REFRESH_TOKEN
    );
  }

  async handleCallEvent(callData) {
    try {
      logger.info('Processing Aircall webhook', { callData });

      // Extract caller information
      const callerNumber = callData.direction === 'inbound' ? callData.from : callData.to;
      const recipientNumber = callData.direction === 'inbound' ? callData.to : callData.from;

      // Check if contact exists in OGGO
      let contact = await this.oggoApi.searchContact(callerNumber);
      
      const contactData = {
        phone: callerNumber,
        firstName: callData.contact?.name?.split(' ')[0] || 'Unknown',
        lastName: callData.contact?.name?.split(' ').slice(1).join(' ') || 'Caller',
        email: callData.contact?.email || '',
        address: callData.contact?.address || '',
        postalCode: callData.contact?.postal_code || '',
        city: callData.contact?.city || '',
        company: callData.contact?.company || ''
      };

      if (!contact) {
        // Create new contact in OGGO
        contact = await this.oggoApi.createContact(contactData);
        logger.info('Created new contact in OGGO', { contact });
      }

      // Create auto project in OGGO (default insurance type)
      const project = await this.oggoApi.createAutoProject(contactData, {
        direction: callData.direction,
        duration: callData.duration,
        notes: callData.notes || ''
      });
      logger.info('Created auto project in OGGO', { project });

      // Sync with Zoho CRM
      await this.zohoApi.syncCallData({
        callType: CALL_TYPES[callData.direction.toUpperCase()],
        callStatus: CALL_STATUSES.ANSWERED, // Default to answered
        duration: callData.duration,
        date: new Date(callData.started_at * 1000).toISOString(),
        recordingUrl: callData.recording_url,
        callerNumber,
        recipientNumber,
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

module.exports = AircallWebhook;