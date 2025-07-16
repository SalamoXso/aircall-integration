const zoho = require('zoho-crm');
const logger = require('../utils/logger');
const helpers = require('../utils/helpers');

class ZohoApi {
  constructor() {
    this.initialized = false;
    this.initialize();
  }

  async initialize() {
    try {
      await zoho.configure({
        client_id: process.env.ZOHO_CLIENT_ID,
        client_secret: process.env.ZOHO_CLIENT_SECRET,
        refresh_token: process.env.ZOHO_REFRESH_TOKEN,
        user_identifier: process.env.ZOHO_CRM_DEFAULT_ACCOUNT,
        base_url: 'https://www.zohoapis.com',
        version: 'v2'
      });
      this.initialized = true;
    } catch (error) {
      helpers.handleError(error, 'Zoho API Initialization Failed');
    }
  }

  async createLead(leadData) {
    if (!this.initialized) {
      throw new Error('Zoho API not initialized');
    }

    try {
      const response = await zoho.API.Leads.create({
        data: [leadData]
      });
      return response.data[0].details;
    } catch (error) {
      helpers.handleError(error, 'Zoho Lead Creation Failed');
      throw error;
    }
  }

  async updateLead(leadId, updateData) {
    if (!this.initialized) {
      throw new Error('Zoho API not initialized');
    }

    try {
      const response = await zoho.API.Leads.update({
        id: leadId,
        data: [updateData]
      });
      return response.data[0].details;
    } catch (error) {
      helpers.handleError(error, 'Zoho Lead Update Failed');
      throw error;
    }
  }

  async searchLeadByPhone(phone) {
    if (!this.initialized) {
      throw new Error('Zoho API not initialized');
    }

    try {
      const formattedPhone = helpers.formatPhoneNumber(phone);
      const response = await zoho.API.Leads.search({
        criteria: `(Phone:equals:${formattedPhone})`
      });
      return response.data[0] || null;
    } catch (error) {
      helpers.handleError(error, 'Zoho Lead Search Failed');
      throw error;
    }
  }
}

module.exports = new ZohoApi();