const axios = require('axios');
const OAuth = require('oauth-1.0a');
const crypto = require('crypto');
const logger = require('../utils/logger');
const helpers = require('../utils/helpers');
const constants = require('../config/constants');

class OggoApi {
  constructor() {
    this.baseUrl = process.env.OGGO_API_BASE_URL;
    
    this.oauth = OAuth({
      consumer: {
        key: process.env.OGGO_CONSUMER_KEY,
        secret: process.env.OGGO_CONSUMER_SECRET
      },
      signature_method: 'HMAC-SHA256',
      hash_function: (base_string, key) => {
        return crypto.createHmac('sha256', key)
          .update(base_string)
          .digest('base64');
      }
    });
  }

  async _makeRequest(method, endpoint, data = {}) {
    try {
      const request = {
        url: `${this.baseUrl}${endpoint}`,
        method,
        data
      };

      const headers = this.oauth.toHeader(this.oauth.authorize(request));
      
      const config = {
        method,
        url: request.url,
        headers: {
          ...headers,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      };

      if (method === 'GET') {
        config.params = data;
      } else {
        config.data = data;
      }

      const response = await axios(config);
      return response.data;
    } catch (error) {
      helpers.handleError(error, 'OGGO API Request Failed');
      throw error;
    }
  }

  async searchContactByPhone(phone) {
    const formattedPhone = helpers.formatPhoneNumber(phone);
    return this._makeRequest('GET', '/contact', {
      'filters[phones]': formattedPhone
    });
  }

  async createContact(contactData) {
    const payload = {
      type: constants.OGGO_CONTACT_TYPES.INDIVIDUAL,
      status: constants.OGGO_CONTACT_STATUSES.PROSPECT,
      civility: '1', // Monsieur by default
      ...contactData
    };
    
    return this._makeRequest('POST', '/contact', payload);
  }

  async updateContact(contactId, updateData) {
    return this._makeRequest('PUT', `/contact/${contactId}`, updateData);
  }

  async createProject(projectData) {
    return this._makeRequest('POST', '/project', {
      type: constants.DEFAULT_INSURANCE_TYPE,
      ...projectData
    });
  }
}

module.exports = new OggoApi();