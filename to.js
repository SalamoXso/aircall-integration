const OAuth = require('oauth-1.0a');
const crypto = require('crypto');
const axios = require('axios');

const oauth = OAuth({
  consumer: {
    key: 'EKkefEy2azJxbWU7nqPUdF3BEZfFqwgP',
    secret: 'BWsLCt2wfYjQbMM6h7G3dLG3zBqPpZSC',
  },
  signature_method: 'HMAC-SHA256',
  hash_function(base_string, key) {
    return crypto.createHmac('sha256', key).update(base_string).digest('base64');
  }
});

const request_data = {
  url: 'https://oggo-data.net/goapi/contact/search',
  method: 'POST',
  data: {
    "filters[phones]": "0612345678"
  }
};

const oauth_data = oauth.authorize(request_data);

const headers = {
  ...oauth.toHeader(oauth_data),
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

axios({
  method: request_data.method,
  url: request_data.url,
  data: request_data.data,
  headers
}).then(response => {
  console.log("✅ Success:", response.data);
}).catch(error => {
  console.error("❌ Error:", error.response?.data || error.message);
});
