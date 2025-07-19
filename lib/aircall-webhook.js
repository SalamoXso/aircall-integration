const zohoApi = require('./zoho-api');
const oggoApi = require('./oggo-api');
const logger = require('../utils/logger');
const { CALL_TYPES, CALL_STATUSES } = require('../config/constants');

class AircallWebhook {
  constructor() {
    this.zohoApi = zohoApi;
    this.oggoApi = oggoApi;
  }

  async handleCallEvent(eventData) {
    try {
      logger.info('Processing call event', { event: eventData.event });

      if (eventData.event === 'call.created') {
        await this.processNewCall(eventData.data);
      } else if (eventData.event === 'call.updated') {
        await this.processUpdatedCall(eventData.data);
      }

      logger.info('Call event processed successfully');
    } catch (error) {
      logger.error('Failed to process call event', {
        error: error.message,
        stack: error.stack,
        eventData
      });
      throw error;
    }
  }

  async processNewCall(callData) {
    const { id, direction, number, duration, started_at } = callData;
    
    // 1. Find or create contact in both systems
    const contact = await this.findOrCreateContact(number);
    
    // 2. Sync call data
    await this.syncCallToCrmSystems({
      callId: id,
      direction,
      callerNumber: number,
      duration,
      date: started_at,
      contactId: contact.id,
      system: contact.system // 'zoho' or 'oggo'
    });
  }

  async findOrCreateContact(phoneNumber) {
    try {
      // Try Zoho first
      const zohoContact = await this.zohoApi.searchContact(phoneNumber);
      if (zohoContact && zohoContact.data && zohoContact.data.length > 0) {
        return { id: zohoContact.data[0].id, system: 'zoho' };
      }

      // Fallback to OGGO
      const oggoContact = await this.oggoApi.searchContact(phoneNumber);
      if (oggoContact) {
        return { id: oggoContact.id, system: 'oggo' };
      }

      // Create new in Zoho if not found
      const newContact = await this.zohoApi.createContact({
        Phone: phoneNumber,
        Last_Name: 'Unknown',
        First_Name: 'Caller'
      });
      return { id: newContact.data[0].details.id, system: 'zoho' };
    } catch (error) {
      logger.error('Contact lookup failed', { phoneNumber, error });
      throw error;
    }
  }

  async syncCallToCrmSystems(callData) {
    try {
      if (callData.system === 'zoho') {
        await this.zohoApi.syncCallData(callData);
      } else {
        await this.oggoApi.createCallActivity(callData);
      }
    } catch (error) {
      logger.error('Failed to sync call data', { callData, error });
      throw error;
    }
  }
}

module.exports = new AircallWebhook();