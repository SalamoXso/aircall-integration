const oauth = require('oauth-1.0a');
const crypto = require('crypto');
const axios = require('axios');
const { OGGO_CONTACT_TYPES, OGGO_CONTACT_STATUSES, OGGO_API_BASE_URL } = require('../config/constants');
const logger = require('../utils/logger');

class OGGOApi {
  constructor(consumerKey, consumerSecret, baseUrl = OGGO_API_BASE_URL) {
    this.consumerKey = consumerKey;
    this.consumerSecret = consumerSecret;
    this.baseUrl = baseUrl;
    
    this.oauth = oauth({
      consumer: { key: this.consumerKey, secret: this.consumerSecret },
      signature_method: 'HMAC-SHA1', // OGGO expects SHA1
      hash_function: (baseString, key) => crypto.createHmac('sha1', key).update(baseString).digest('base64')
    });
  }

  async _getAuthHeaders(url, method) {
    const requestData = {
      url,
      method
    };
    
    const headers = this.oauth.toHeader(this.oauth.authorize(requestData));
    return {
      ...headers,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  async searchContact(phoneNumber) {
    if (!phoneNumber) {
      throw new Error('Phone number is required for contact search');
    }

    // OGGO API expects phone numbers without '+' prefix
    const cleanPhone = phoneNumber.replace(/^\+/, '');
    const url = `${this.baseUrl}contact?filters[phones]=${encodeURIComponent(cleanPhone)}`;
    
    try {
      const headers = await this._getAuthHeaders(url, 'GET');
      const response = await axios.get(url, { headers });
      
      if (!response.data || !Array.isArray(response.data)) {
        throw new Error('Invalid response format from OGGO API');
      }
      
      return response.data.length > 0 ? response.data[0] : null;
    } catch (error) {
      logger.error('OGGO API Search Error:', {
        url,
        error: error.response?.data || error.message
      });
      throw error;
    }
  }

  async createContact(contactData) {
    if (!contactData.phone) {
      throw new Error('Phone number is required to create contact');
    }

    const url = `${this.baseUrl}contact`;
    const headers = await this._getAuthHeaders(url, 'POST');
    
    const payload = {
      type: contactData.company ? OGGO_CONTACT_TYPES.COMPANY : OGGO_CONTACT_TYPES.INDIVIDUAL,
      status: OGGO_CONTACT_STATUSES.PROSPECT,
      firstname: contactData.firstName || 'Unknown',
      lastname: contactData.lastName || 'Caller',
      email: contactData.email || '',
      phones: [contactData.phone.replace(/^\+/, '')], // Remove '+' prefix
      thoroughfare: contactData.address || '',
      postal_code: contactData.postalCode || '',
      locality: contactData.city || '',
      country: contactData.country || 'FR'
    };

    if (contactData.company) {
      payload.corporate_name = contactData.company;
      payload.legal_form = 'SARL';
    }

    try {
      const response = await axios.post(url, payload, { headers });
      return response.data;
    } catch (error) {
      logger.error('OGGO API Create Error:', {
        payload,
        error: error.response?.data || error.message
      });
      throw error;
    }
  }

  async createAutoProject(contactData, callData) {
    const url = `${this.baseUrl}project/auto`;
    const headers = await this._getAuthHeaders(url, 'POST');

    const projectData = {
      effective_date: new Date().toLocaleDateString('fr-FR'),
      contact: {
        type: contactData.company ? 'corp' : 'private',
        firstname: contactData.firstName || 'Unknown',
        lastname: contactData.lastName || 'Caller',
        email: contactData.email || '',
        phones: [{ number: contactData.phone.replace(/^\+/, '') }],
        thoroughfare: contactData.address || '',
        postal_code: contactData.postalCode || '',
        locality: contactData.city || '',
        country: contactData.country || 'FR'
      },
      insureds: [{
        affiliate: 'holder',
        civility: 1,
        firstname: contactData.firstName || 'Unknown',
        lastname: contactData.lastName || 'Caller'
      }],
      vehicle: {
        registration_date: new Date(new Date().setFullYear(new Date().getFullYear() - 1))
          .toLocaleDateString('fr-FR'),
        use: '001'
      },
      note: `Call from Aircall\nType: ${callData.direction}\nDuration: ${callData.duration}s\nNotes: ${callData.notes || ''}`
    };

    try {
      const response = await axios.post(url, projectData, { headers });
      return response.data;
    } catch (error) {
      logger.error('OGGO API Project Error:', {
        projectData,
        error: error.response?.data || error.message
      });
      throw error;
    }
  }
}

module.exports = OGGOApi;