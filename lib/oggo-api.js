const axios = require('axios');
const { OGGO_API_BASE_URL, OGGO_CONSUMER_KEY, OGGO_CONSUMER_SECRET } = require('../config/constants');
const logger = require('../utils/logger');

class OggoApi {
  constructor() {
    this.baseUrl = OGGO_API_BASE_URL;
    this.token = null;
    this.tokenExpiry = null;
  }

  async _authenticate() {
    try {
      const response = await axios.post(`${this.baseUrl}/oauth/token`, {
        consumer_key: OGGO_CONSUMER_KEY,
        consumer_secret: OGGO_CONSUMER_SECRET
      });
      
      this.token = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000);
      return this.token;
    } catch (error) {
      logger.error('OGGO authentication failed', error);
      throw error;
    }
  }

  async _makeRequest(config) {
    if (!this.token || Date.now() >= this.tokenExpiry - 60000) {
      await this._authenticate();
    }

    try {
      const response = await axios({
        ...config,
        baseURL: this.baseUrl,
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
          ...config.headers
        }
      });
      return response.data;
    } catch (error) {
      logger.error('OGGO API request failed', {
        endpoint: config.url,
        status: error.response?.status,
        error: error.message
      });
      throw error;
    }
  }

  // Health check method
  async ping() {
    return this._makeRequest({
      method: 'GET',
      url: '/health'
    });
  }

  async searchContact(phoneOrEmail) {
    return this._makeRequest({
      method: 'GET',
      url: '/contacts/search',
      params: {
        phone: phoneOrEmail,
        email: phoneOrEmail
      }
    });
  }

  async createContact(contactData) {
    return this._makeRequest({
      method: 'POST',
      url: '/contacts',
      data: contactData
    });
  }

  async createCallActivity(callData) {
    return this._makeRequest({
      method: 'POST',
      url: '/activities/calls',
      data: {
        contact_id: callData.contactId,
        direction: callData.direction,
        duration: callData.duration,
        status: 'completed',
        notes: callData.notes || '',
        recording_url: callData.recordingUrl || '',
        timestamp: callData.date
      }
    });
  }
}

module.exports = new OggoApi();