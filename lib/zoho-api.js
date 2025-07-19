const axios = require('axios');
const { ZOHO_CRM_API_URL } = require('../config/constants');
const logger = require('../utils/logger');

class ZohoApi {
  constructor(clientId, clientSecret, refreshToken) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.refreshToken = refreshToken;
    this.accessToken = null;
    this.apiUrl = ZOHO_CRM_API_URL;
  }

  async _getAccessToken() {
    try {
      const response = await axios.post('https://accounts.zoho.com/oauth/v2/token', null, {
        params: {
          refresh_token: this.refreshToken,
          client_id: this.clientId,
          client_secret: this.clientSecret,
          grant_type: 'refresh_token'
        }
      });
      this.accessToken = response.data.access_token;
      return this.accessToken;
    } catch (error) {
      logger.error('Failed to get Zoho access token', error);
      throw error;
    }
  }

  async createTestLead() {
    try {
      const token = await this._getAccessToken();
      const response = await axios.post(
        `${this.apiUrl}/Leads`,
        {
          data: [{
            Last_Name: 'Test',
            First_Name: 'Lead',
            Email: 'test@example.com',
            Phone: '+33123456789',
            Company: 'Test Company'
          }]
        },
        {
          headers: {
            'Authorization': `Zoho-oauthtoken ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data.data[0];
    } catch (error) {
      logger.error('Failed to create test lead in Zoho', error);
      throw error;
    }
  }

  async syncCallData(callData) {
    try {
      const token = await this._getAccessToken();
      const response = await axios.post(
        `${this.apiUrl}/Calls`,
        {
          data: [{
            Subject: `Call from ${callData.callerNumber}`,
            Call_Type: callData.callType,
            Call_Status: callData.callStatus,
            Call_Duration: callData.duration,
            Call_Start_Time: callData.date,
            Recording_URL: callData.recordingUrl,
            Who_Id: callData.contactId,
            Description: callData.notes
          }]
        },
        {
          headers: {
            'Authorization': `Zoho-oauthtoken ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data.data[0];
    } catch (error) {
      logger.error('Failed to sync call data to Zoho', error);
      throw error;
    }
  }
}

// Export the class directly
module.exports = ZohoApi;