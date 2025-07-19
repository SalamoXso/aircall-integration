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
      logger.info('Processing Aircall webhook', { 
        event: callData.event,
        callId: callData.data?.id 
      });

      // Validate incoming data
      if (!callData.data) {
        throw new Error('Missing call data in webhook payload');
      }

      const { direction, from, to, contact } = callData.data;
      const callerNumber = direction === 'inbound' ? from : to;

      if (!callerNumber) {
        throw new Error('Missing phone number in call data');
      }

      const contactData = {
        phone: callerNumber,
        firstName: contact?.name?.split(' ')[0] || 'Unknown',
        lastName: contact?.name?.split(' ').slice(1).join(' ') || 'Caller',
        email: contact?.email || '',
        company: contact?.company || '',
        address: contact?.address || '',
        postalCode: contact?.postal_code || '',
        city: contact?.city || '',
        country: contact?.country || 'FR'
      };

      // Check if contact exists in OGGO
      let contactRecord;
      try {
        contactRecord = await this.oggoApi.searchContact(contactData.phone);
      } catch (searchError) {
        logger.warn('Contact search failed, creating new contact', { error: searchError.message });
        contactRecord = null;
      }

      if (!contactRecord) {
        // Create new contact in OGGO
        contactRecord = await this.oggoApi.createContact(contactData);
        logger.info('Created new contact in OGGO', { 
          contactId: contactRecord.uuid 
        });
      }

      // Create auto project in OGGO
      const project = await this.oggoApi.createAutoProject(contactData, {
        direction,
        duration: callData.data.duration || 0,
        notes: callData.data.notes || ''
      });
      logger.info('Created auto project in OGGO', { 
        projectId: project.uuid 
      });

      // Sync with Zoho CRM
      await this.zohoApi.syncCallData({
        callType: CALL_TYPES[direction.toUpperCase()] || CALL_TYPES.INBOUND,
        callStatus: callData.data.status === 'answered' 
          ? CALL_STATUSES.ANSWERED 
          : CALL_STATUSES.NOT_ANSWERED,
        duration: callData.data.duration || 0,
        date: new Date((callData.data.started_at || Date.now() / 1000) * 1000).toISOString(),
        recordingUrl: callData.data.recording_url || '',
        callerNumber: from,
        recipientNumber: to,
        notes: callData.data.notes || '',
        tags: callData.data.tags || [],
        contactId: contactRecord.uuid
      });

      return { success: true, contact: contactRecord, project };
    } catch (error) {
      logger.error('Error processing Aircall webhook', { 
        error: error.message,
        stack: error.stack 
      });
      throw error;
    }
  }
}

module.exports = new AircallWebhook();