const axios = require('axios');
const logger = require('../utils/logger');
const helpers = require('../utils/helpers');

class ZohoApi {
  constructor() {
    this.accessToken = null;
    this.tokenExpiry = null;
    this.initialize().catch(error => {
      logger.error('Initialization error:', error);
    });
  }

  async initialize() {
    try {
      await this.refreshAccessToken();
      logger.info('✅ Zoho API initialized successfully');
    } catch (error) {
      logger.error('Zoho API initialization failed:', error);
      throw error;
    }
  }

  async refreshAccessToken() {
    try {
      const response = await axios.post(
        'https://accounts.zoho.com/oauth/v2/token',
        new URLSearchParams({
          refresh_token: process.env.ZOHO_REFRESH_TOKEN,
          client_id: process.env.ZOHO_CLIENT_ID,
          client_secret: process.env.ZOHO_CLIENT_SECRET,
          grant_type: 'refresh_token'
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000);
      logger.info('Zoho access token refreshed');
      return this.accessToken;
    } catch (error) {
      logger.error('Token refresh failed:', {
        error: error.response?.data || error.message,
        status: error.response?.status
      });
      throw new Error('Failed to refresh Zoho token');
    }
  }

  async ensureValidToken() {
    if (!this.accessToken || Date.now() >= this.tokenExpiry - 60000) {
      await this.refreshAccessToken();
    }
  }

  async makeRequest(config) {
    await this.ensureValidToken();
    
    try {
      const response = await axios({
        ...config,
        headers: {
          ...config.headers,
          'Authorization': `Zoho-oauthtoken ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      logger.error('Zoho API request failed:', {
        url: config.url,
        error: error.response?.data || error.message,
        status: error.response?.status
      });
      
      // Auto-retry once if token might be expired
      if (error.response?.status === 401) {
        await this.refreshAccessToken();
        const retryResponse = await axios({
          ...config,
          headers: {
            ...config.headers,
            'Authorization': `Zoho-oauthtoken ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        });
        return retryResponse.data;
      }
      
      throw error;
    }
  }

  async createLead(leadData) {
    try {
      const data = await this.makeRequest({
        method: 'post',
        url: 'https://www.zohoapis.com/crm/v2/Leads',
        data: { data: [leadData] }
      });
      
      return data.data[0].details;
    } catch (error) {
      throw new Error(`Lead creation failed: ${error.message}`);
    }
  }

  async updateLead(leadId, updateData) {
    try {
      const data = await this.makeRequest({
        method: 'put',
        url: `https://www.zohoapis.com/crm/v2/Leads/${leadId}`,
        data: { data: [updateData] }
      });
      
      return data.data[0].details;
    } catch (error) {
      throw new Error(`Lead update failed: ${error.message}`);
    }
  }

  async searchLeadByPhone(phone) {
    try {
      const formattedPhone = helpers.formatPhoneNumber(phone);
      const data = await this.makeRequest({
        method: 'get',
        url: `https://www.zohoapis.com/crm/v2/Leads/search`,
        params: {
          criteria: `(Phone:equals:${encodeURIComponent(formattedPhone)})`
        }
      });
      
      return data.data[0] || null;
    } catch (error) {
      throw new Error(`Lead search failed: ${error.message}`);
    }
  }

  // Test method
  async createTestLead() {
    return this.createLead({
      Last_Name: 'Test Lead',
      Company: 'Test Company',
      Description: 'Created by Aircall integration test'
    });
  }
}

module.exports = new ZohoApi();