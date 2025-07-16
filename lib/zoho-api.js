const {
  InitializeBuilder,
  UserSignature,
  Environment,
  OAuthBuilder,
  USDataCenter,
  RecordOperations,
  ParameterMap,
  SDKConfigBuilder,
  TokenStoreBuilder,
  Logger,
  Levels,
  APIException,
} = require('@zohocrm/nodejs-sdk');

const logger = require('../utils/logger');
const helpers = require('../utils/helpers');

class ZohoApi {
  constructor() {
    this.initialized = false;
    this.initialize();
  }

  async initialize() {
    try {
      const user = new UserSignature(process.env.ZOHO_CRM_DEFAULT_ACCOUNT);
      const environment = USDataCenter.PRODUCTION();
      const token = new OAuthBuilder()
        .clientId(process.env.ZOHO_CLIENT_ID)
        .clientSecret(process.env.ZOHO_CLIENT_SECRET)
        .refreshToken(process.env.ZOHO_REFRESH_TOKEN)
        .redirectURL('https://www.zoho.com')
        .build();
      const store = new TokenStoreBuilder().filePath('./zoho_tokens.txt').build();
      const config = new SDKConfigBuilder().autoRefreshFields(true).build();
      const sdkLogger = new Logger.Builder()
        .level(Levels.INFO)
        .filePath('./zoho_sdk.log')
        .build();

      await new InitializeBuilder()
        .user(user)
        .environment(environment)
        .token(token)
        .store(store)
        .SDKConfig(config)
        .logger(sdkLogger)
        .initialize();

      this.initialized = true;
    } catch (error) {
      helpers.handleError(error, 'Zoho SDK Initialization Failed');
    }
  }

  async createLead(leadData) {
    if (!this.initialized) throw new Error('Zoho SDK not initialized');

    try {
      const recordOperations = new RecordOperations();
      const moduleAPIName = 'Leads';
      const request = {
        data: [leadData]
      };
      const response = await recordOperations.createRecords(moduleAPIName, request);
      const details = response.getObject()?.data?.[0]?.details;
      return details;
    } catch (error) {
      helpers.handleError(error, 'Zoho Lead Creation Failed');
      throw error;
    }
  }

  async updateLead(leadId, updateData) {
    if (!this.initialized) throw new Error('Zoho SDK not initialized');

    try {
      const recordOperations = new RecordOperations();
      const moduleAPIName = 'Leads';
      updateData.id = leadId;
      const request = {
        data: [updateData]
      };
      const response = await recordOperations.updateRecords(moduleAPIName, request);
      const details = response.getObject()?.data?.[0]?.details;
      return details;
    } catch (error) {
      helpers.handleError(error, 'Zoho Lead Update Failed');
      throw error;
    }
  }

  async searchLeadByPhone(phone) {
    if (!this.initialized) throw new Error('Zoho SDK not initialized');

    try {
      const recordOperations = new RecordOperations();
      const moduleAPIName = 'Leads';
      const params = new ParameterMap();
      const formattedPhone = helpers.formatPhoneNumber(phone);
      await params.addParam({ name: 'phone', value: formattedPhone });

      const response = await recordOperations.searchRecords(moduleAPIName, params);
      const data = response.getObject()?.data?.[0] || null;
      return data;
    } catch (error) {
      helpers.handleError(error, 'Zoho Lead Search Failed');
      throw error;
    }
  }
}

module.exports = new ZohoApi();
