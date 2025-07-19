const axios = require('axios');
const OAuth = require('oauth-1.0a');
const crypto = require('crypto');
const logger = require('../utils/logger');

class OggoApi {
  constructor() {
    this.baseUrl = process.env.OGGO_API_BASE_URL || 'https://api.oggodata.com';
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
    const url = `${this.baseUrl}${endpoint}`;
    const requestData = {
      url,
      method,
      data
    };

    try {
      const headers = this.oauth.toHeader(this.oauth.authorize(requestData));
      
      const config = {
        method,
        url,
        headers: {
          ...headers,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      };

      if (method === 'GET') {
        config.params = data;
      } else {
        config.data = data;
      }

      logger.debug('Making OGGO API request', { config });
      const response = await axios(config);
      return response.data;
    } catch (error) {
      logger.error('OGGO API request failed', {
        url,
        method,
        error: error.response?.data || error.message,
        status: error.response?.status
      });
      throw error;
    }
  }

  async searchContactByPhone(phone) {
    const formattedPhone = phone.replace(/\D/g, '');
    return this._makeRequest('GET', '/contact', {
      'filters[phones]': formattedPhone
    });
  }

  async createContact(contactData) {
    return this._makeRequest('POST', '/contact', {
      type: 'PERSONNE PHYSIQUE',
      status: 'PROSPECT',
      civility: '1', // Monsieur
      ...contactData
    });
  }
}

module.exports = new OggoApi();