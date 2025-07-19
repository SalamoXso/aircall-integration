const { getToken } = require('./zoho-token');
const axios = require('axios');
const { ZOHO_CRM_API_URL, CALL_TYPES, CALL_STATUSES } = require('../config/constants');
const logger = require('../utils/logger');

class ZohoApi {
  constructor() {
    this.apiUrl = ZOHO_CRM_API_URL;
    this.maxRetries = 2;
  }

  async _makeAuthorizedRequest(config, retryCount = 0) {
    try {
      const token = await getToken();
      const response = await axios({
        ...config,
        baseURL: this.apiUrl,
        headers: {
          'Authorization': `Zoho-oauthtoken ${token.access_token}`,
          'Content-Type': 'application/json',
          ...config.headers
        },
        timeout: 10000
      });
      return response.data;
    } catch (error) {
      if (error.response?.status === 401 && retryCount < this.maxRetries) {
        logger.warn('Token expired, refreshing and retrying...', { retryCount });
        await getToken(); // Force refresh
        return this._makeAuthorizedRequest(config, retryCount + 1);
      }

      const errorData = {
        endpoint: config.url,
        status: error.response?.status,
        code: error.response?.data?.code,
        message: error.response?.data?.message || error.message
      };
      logger.error('Zoho API request failed', errorData);
      throw error;
    }
  }

  async createTestLead() {
    return this._makeAuthorizedRequest({
      method: 'POST',
      url: '/Leads',
      data: {
        data: [{
          Last_Name: 'Test',
          First_Name: 'Lead',
          Email: 'test@example.com',
          Phone: '+33123456789',
          Company: 'Test Company',
          Lead_Source: 'Aircall Integration'
        }]
      }
    });
  }

  async syncCallData(callData) {
    return this._makeRequest({
      method: 'POST',
      url: '/Tasks',
      data: {
        data: [{
          Subject: `Call from ${callData.callerNumber}`,
          Call_Type: CALL_TYPES[callData.callType] || callData.callType,
          Status: CALL_STATUSES[callData.callStatus] || callData.callStatus,
          Call_Duration: callData.duration,
          Due_Date: new Date(callData.date).toISOString(),
          Description: [
            `Direction: ${callData.direction}`,
            callData.recordingUrl && `Recording: ${callData.recordingUrl}`,
            callData.notes && `Notes: ${callData.notes}`,
            callData.tags && `Tags: ${callData.tags.join(', ')}`
          ].filter(Boolean).join('\n'),
          What_Id: callData.contactId
        }]
      }
    });
  }

  async searchContact(phoneOrEmail) {
    return this._makeRequest({
      method: 'GET',
      url: '/Contacts/search',
      params: {
        criteria: `(Phone:equals:${phoneOrEmail})or(Email:equals:${phoneOrEmail})`
      }
    });
  }

  async getContactById(id) {
    return this._makeRequest({
      method: 'GET',
      url: `/Contacts/${id}`
    });
  }
}

module.exports = new ZohoApi();