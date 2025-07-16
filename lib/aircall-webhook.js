const logger = require('../utils/logger');
const helpers = require('../utils/helpers');
const oggoApi = require('./oggo-api');
const zohoApi = require('./zoho-api');
const constants = require('../config/constants');

class AircallWebhook {
  async handleCallEvent(eventData) {
    try {
      const { event, data: call } = eventData;
      
      logger.info(`Processing Aircall event: ${event}`, { call });

      switch (event) {
        case 'call.created':
          await this.handleNewCall(call);
          break;
          
        case 'call.answered':
          await this.handleAnsweredCall(call);
          break;
          
        case 'call.ended':
          await this.handleEndedCall(call);
          break;
          
        case 'call.tagged':
          await this.handleTaggedCall(call);
          break;
          
        case 'call.commented':
          await this.handleCommentedCall(call);
          break;
          
        default:
          logger.info(`Unhandled Aircall event: ${event}`);
      }
    } catch (error) {
      helpers.handleError(error, 'Aircall Webhook Processing Failed');
    }
  }

  async handleNewCall(call) {
    try {
      // 1. Process in OGGO CRM
      const oggoContact = await oggoApi.searchContactByPhone(call.phone_number);
      
      if (oggoContact && oggoContact.length > 0) {
        await oggoApi.updateContact(oggoContact[0].uuid, {
          changed: Math.floor(Date.now() / 1000)
        });
      } else {
        await oggoApi.createContact({
          firstname: call.name || 'Unknown',
          lastname: 'Caller',
          phones: [call.phone_number],
          email: call.email || ''
        });
      }
      
      // 2. Process in Zoho CRM
      const zohoLead = await zohoApi.searchLeadByPhone(call.phone_number);
      
      const leadData = {
        Last_Name: call.name || 'Caller',
        Phone: call.phone_number,
        Description: `New ${call.direction} call from ${call.phone_number}`,
        Lead_Source: 'Aircall'
      };
      
      if (zohoLead) {
        await zohoApi.updateLead(zohoLead.id, leadData);
      } else {
        await zohoApi.createLead(leadData);
      }
      
      logger.info('Successfully processed new call', { call });
    } catch (error) {
      helpers.handleError(error, 'New Call Processing Failed');
    }
  }

  async handleAnsweredCall(call) {
    // Implement specific logic for answered calls
    logger.info(`Call answered: ${call.id}`);
  }

  async handleEndedCall(call) {
    try {
      // Create call activity in OGGO
      await oggoApi.createProject({
        contact_uuid: call.contact_id, // This would need to be mapped
        call_data: {
          duration: call.duration,
          recording: call.recording_url,
          type: call.direction === 'inbound' ? 
            constants.CALL_TYPES.INBOUND : 
            constants.CALL_TYPES.OUTBOUND,
          status: call.missed ? 
            constants.CALL_STATUSES.MISSED : 
            constants.CALL_STATUSES.ANSWERED
        }
      });
      
      logger.info('Successfully processed ended call', { call });
    } catch (error) {
      helpers.handleError(error, 'Ended Call Processing Failed');
    }
  }

  // Implement other handlers similarly...
}

module.exports = new AircallWebhook();