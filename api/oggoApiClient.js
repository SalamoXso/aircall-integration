const axios = require('axios');
const OAuth = require('oauth-1.0a');
const crypto = require('crypto');

class OggoApiClient {
  constructor(key, secret, baseUrl) {
    this.oauth = OAuth({
      consumer: { key, secret },
      signature_method: 'HMAC-SHA1',
      hash_function: (base, key) => 
        crypto.createHmac('sha1', key).update(base).digest('base64')
    });
    this.baseUrl = baseUrl;
  }

  async request({ method = 'POST', endpoint, data }) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      ...this.oauth.toHeader(this.oauth.authorize({ url, method })),
      'Content-Type': 'application/json'
    };

    try {
      const res = await axios({ method, url, headers, data });
      return res.data;
    } catch (err) {
      throw new Error(err.response?.data || err.message);
    }
  }
}

module.exports = OggoApiClient;