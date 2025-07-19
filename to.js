const axios = require('axios');
const OAuth = require('oauth-1.0a');
const crypto = require('crypto');

// ✅ Step 1: Create HMAC-SHA1 hash function
const oauth = OAuth({
  consumer: {
    key: 'EKkefEy2azJxbWU7nqPUdF3BEZfFqwgP',
    secret: 'BWsLCt2wfYjQbMM6h7G3dLG3zBqPpZSC',
  },
  signature_method: 'HMAC-SHA1',
  hash_function(base_string, key) {
    return crypto
      .createHmac('sha1', key)
      .update(base_string)
      .digest('base64');
  },
});

const url = 'https://oggo-data.net/api/project/health';
const method = 'POST';

const bodyData = {
  effective_date: '10/01/2025',
  contact: {
    civility: 1,
    firstname: 'Jean',
    lastname: 'Dupont',
    thoroughfare: '1 rue du test',
    postal_code: '75001',
    locality: 'Paris',
    country: 'FR',
    phones: [
      { number: '+33102030405', bloctel: 'authorized', bloctel_date: '28/07/2021' },
      { number: '+33602030405', bloctel: 'unverified' },
    ],
    email: 'jean.dupont@example.com',
  },
  insureds: [
    { affiliate: 'holder', birthdate: '10/10/1980', regime: 'salarie' },
    { affiliate: 'partner', birthdate: '11/11/1981', regime: 'salarie' },
  ],
  wishes: {
    soins: 3,
    hospitalisation: 5,
    optique: 0,
    dentaire: 2,
  },
  note: 'Test project for health insurance.',
};

// ✅ Step 2: Build OAuth signature
const requestData = {
  url,
  method,
};

// ✅ Step 3: Add OAuth header to request
const oauthHeader = oauth.toHeader(oauth.authorize(requestData));

// ✅ Step 4: Make the request with axios
axios({
  method,
  url,
  headers: {
    ...oauthHeader,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  data: bodyData,
})
  .then((response) => {
    console.log('✅ Success:', response.data);
  })
  .catch((error) => {
    console.error('❌ Error:', error.response ? error.response.data : error.message);
  });
