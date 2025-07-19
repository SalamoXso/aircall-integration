const { getToken } = require('./zoho-token');
const axios = require('axios');
const { ZOHO_CRM_API_URL, CALL_TYPES, CALL_STATUSES } = require('../config/constants');
const logger = require('../utils/logger');

class ZohoApi {
  constructor() {
    this.apiUrl = ZOHO_CRM_API_URL;
    this.tokenCache = {
      accessToken: null,
      expiresAt: 0
    };
  }

  async _refreshTokenIfNeeded() {
    if (!this.tokenCache.accessToken || Date.now() >= this.tokenCache.expiresAt - 60000) {
      try {
        const { access_token, expires_in } = await getToken();
        this.tokenCache = {
          accessToken: access_token,
          expiresAt: Date.now() + (expires_in * 1000)
        };
      } catch (error) {
        logger.error('Token refresh failed', error);
        throw new Error('Failed to refresh Zoho token');
      }
    }
    return this.tokenCache.accessToken;
  }

  async _makeRequest(config) {
    const token = await this._refreshTokenIfNeeded();
    
    try {
      const response = await axios({
        ...config,
        baseURL: this.apiUrl,
        headers: {
          'Authorization': `Zoho-oauthtoken ${token}`,
          'Content-Type': 'application/json',
          ...config.headers
        }
      });
      return response.data;
    } catch (error) {
      logger.error('Zoho API request failed', {
        endpoint: config.url,
        status: error.response?.status,
        data: error.response?.data
      });
      throw error;
    }
  }

  async createTestLead() {
    return this._makeRequest({
      method: 'POST',
      url: '/Leads',
      data: {
        data: [{
          Last_Name: 'Test',
          First_Name: 'Lead',
          Email: 'test@example.com',
          Phone: '+33123456789',
          Company: 'Test Company'
        }]
      }
    });
  }

  async syncCallData(callData) {
    return this._makeRequest({
      method: 'POST',
      url: '/Tasks', // Using Tasks instead of Calls for better compatibility
      data: {
        data: [{
          Subject: `Call from ${callData.callerNumber}`,
          Call_Type: CALL_TYPES[callData.callType] || callData.callType,
          Status: CALL_STATUSES[callData.callStatus] || callData.callStatus,
          Call_Duration: callData.duration,
          Due_Date: new Date(callData.date).toISOString(),
          Description: [
            `Call Direction: ${callData.direction}`,
            callData.recordingUrl && `Recording: ${callData.recordingUrl}`,
            callData.notes && `Notes: ${callData.notes}`
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
}

module.exports = new ZohoApi();