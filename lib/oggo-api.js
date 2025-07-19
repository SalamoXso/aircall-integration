const OggoApiClient = require('../api/oggoApiClient');
const { 
  OGGO_API_BASE_URL,
  OGGO_CONSUMER_KEY,
  OGGO_CONSUMER_SECRET,
  OGGO_CONTACT_TYPES,
  DEFAULT_INSURANCE_TYPE
} = require('../config/constants');

class OggoApi {
  constructor() {
    this.client = new OggoApiClient(
      OGGO_CONSUMER_KEY,
      OGGO_CONSUMER_SECRET,
      OGGO_API_BASE_URL
    );
  }

  /**
   * Health check for OGGO API
   */
  async ping() {
    try {
      await this.client.request({
        endpoint: '/health',
        method: 'GET'
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Generic project creation
   * @param {string} type - 'health', 'auto', etc.
   * @param {object} data - OGGO-compatible payload
   */
  async createProject(type, data) {
    return this.client.request({
      endpoint: `/project/${type}`,
      data: {
        ...data,
        contact: {
          ...data.contact,
          type: OGGO_CONTACT_TYPES[data.contact.isCompany ? 'COMPANY' : 'INDIVIDUAL']
        }
      }
    });
  }
}

module.exports = new OggoApi();