const { readFileSync } = require('fs');
const path = require('path');
const { getToken } = require('../lib/zoho-token');

try {
  const tokenData = readFileSync(path.join(__dirname, '../.zoho_token'));
  const token = JSON.parse(tokenData);
  
  if (token.expires_at > Date.now()) {
    currentToken = token;
    console.log('Loaded valid Zoho token from cache');
  }
} catch (err) {
  console.log('No valid Zoho token cache found');
}