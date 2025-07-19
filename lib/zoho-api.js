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

  async createLead(leadData) {
    await this.ensureValidToken();
    
    try {
      const response = await axios.post(
        'https://www.zohoapis.com/crm/v2/Leads',
        { data: [leadData] },
        {
          headers: {
            'Authorization': `Zoho-oauthtoken ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return response.data.data[0].details;
    } catch (error) {
      logger.error('Lead creation failed:', error.response?.data || error.message);
      throw error;
    }
  }

  async createTestLead() {
    return this.createLead({
      Last_Name: 'Test Lead',
      Company: 'Test Company',
      Description: 'Created by integration test'
    });
  }
}

module.exports = new ZohoApi();