module.exports = { 
  CALL_TYPES: { 
    INBOUND: 'inbound', 
    OUTBOUND: 'outbound', 
    MISSED: 'missed' 
  }, 
  CALL_STATUSES: { 
    ANSWERED: 'answered', 
    VOICEMAIL: 'voicemail', 
    NOT_ANSWERED: 'not_answered' 
  }, 
  OGGO_CONTACT_TYPES: { 
    INDIVIDUAL: 'private', 
    COMPANY: 'corp' 
  }, 
  OGGO_CONTACT_STATUSES: { 
    PROSPECT: 'PROSPECT', 
    CLIENT: 'CLIENT' 
  },
  DEFAULT_INSURANCE_TYPE: 'AUTO',
  OGGO_API_BASE_URL: 'https://oggo-data.net/api/',
  ZOHO_CRM_API_URL: 'https://www.zohoapis.com/crm/v2',
ZOHO: {
    AUTH_URL: 'https://accounts.zoho.com/oauth/v2/token',
    CLIENT_ID: process.env.ZOHO_CLIENT_ID,
    CLIENT_SECRET: process.env.ZOHO_CLIENT_SECRET,
    REFRESH_TOKEN: process.env.ZOHO_REFRESH_TOKEN
  },
  OGGO_API_BASE_URL: process.env.OGGO_API_BASE_URL || 'https://oggo-data.net/api',
  OGGO_CONSUMER_KEY: process.env.OGGO_CONSUMER_KEY,
  OGGO_CONSUMER_SECRET: process.env.OGGO_CONSUMER_SECRET,
};