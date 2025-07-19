const axios = require('axios');
const { ZOHO } = require('../config/constants');
const { writeFileSync } = require('fs');
const path = require('path');

let currentToken = null;
let refreshInProgress = false;

async function refreshZohoToken() {
  if (refreshInProgress) {
    // Wait if refresh is already in progress
    await new Promise(resolve => setTimeout(resolve, 1000));
    return currentToken;
  }

  refreshInProgress = true;
  
  try {
    const response = await axios.post(ZOHO.AUTH_URL, new URLSearchParams({
      refresh_token: ZOHO.REFRESH_TOKEN,
      client_id: ZOHO.CLIENT_ID,
      client_secret: ZOHO.CLIENT_SECRET,
      grant_type: 'refresh_token'
    }));

    currentToken = {
      access_token: response.data.access_token,
      expires_at: Date.now() + (response.data.expires_in * 1000)
    };

    // Optional: Store the token for server restarts
    writeFileSync(
      path.join(__dirname, '../.zoho_token'),
      JSON.stringify(currentToken)
    );

    return currentToken;
  } finally {
    refreshInProgress = false;
  }
}

// Initialize on startup
refreshZohoToken().catch(console.error);

module.exports = {
  getToken: async () => {
    if (!currentToken || Date.now() >= currentToken.expires_at - 60000) {
      return refreshZohoToken();
    }
    return currentToken;
  }
};