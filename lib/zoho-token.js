const axios = require('axios');
const { ZOHO } = require('../config/constants');
const { writeFileSync, existsSync, readFileSync } = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const TOKEN_FILE = path.join(__dirname, '../.zoho_token');
let currentToken = null;
let refreshInProgress = false;

// Load token from file if exists
if (existsSync(TOKEN_FILE)) {
  try {
    currentToken = JSON.parse(readFileSync(TOKEN_FILE));
    logger.info('Loaded Zoho token from cache', { 
      expiresAt: new Date(currentToken.expires_at).toISOString() 
    });
  } catch (error) {
    logger.error('Failed to load cached Zoho token', { error: error.message });
  }
}

async function refreshZohoToken() {
  if (refreshInProgress) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return currentToken;
  }

  refreshInProgress = true;
  
  try {
    logger.info('Refreshing Zoho token...');
    const response = await axios.post(ZOHO.AUTH_URL, new URLSearchParams({
      refresh_token: ZOHO.REFRESH_TOKEN,
      client_id: ZOHO.CLIENT_ID,
      client_secret: ZOHO.CLIENT_SECRET,
      grant_type: 'refresh_token'
    }), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    currentToken = {
      access_token: response.data.access_token,
      expires_at: Date.now() + (response.data.expires_in * 1000)
    };

    writeFileSync(TOKEN_FILE, JSON.stringify(currentToken));
    logger.info('Zoho token refreshed successfully', {
      expiresAt: new Date(currentToken.expires_at).toISOString()
    });

    return currentToken;
  } catch (error) {
    logger.error('Zoho token refresh failed', {
      error: error.response?.data || error.message,
      config: {
        authUrl: ZOHO.AUTH_URL,
        clientId: ZOHO.CLIENT_ID ? '****' : 'MISSING',
        hasRefreshToken: !!ZOHO.REFRESH_TOKEN
      }
    });
    throw new Error('Zoho token refresh failed');
  } finally {
    refreshInProgress = false;
  }
}

module.exports = {
  getToken: async () => {
    if (!currentToken || Date.now() >= currentToken.expires_at - 60000) {
      return refreshZohoToken();
    }
    return currentToken;
  },
  // For testing/debugging
  _clearToken: () => { currentToken = null; }
};