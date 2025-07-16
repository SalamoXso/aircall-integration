const ZOHO = require('@zohocrm/nodejs-sdk');
const logger = require('../utils/logger');
const helpers = require('../utils/helpers');

class ZohoApi {
  constructor() {
    this.initialized = false;
    this.initialize();
  }

  async initialize() {
    try {
      const user = new ZOHO.UserSignature(process.env.ZOHO_CRM_DEFAULT_ACCOUNT);
      const environment = ZOHO.USDataCenter.PRODUCTION();

      const token = new ZOHO.OAuthBuilder()
        .clientId(process.env.ZOHO_CLIENT_ID)
        .clientSecret(process.env.ZOHO_CLIENT_SECRET)
        .refreshToken(process.env.ZOHO_REFRESH_TOKEN)
        .redirectURL('https://www.zoho.com') // or your app URL
        .build();

      const store = new ZOHO.FileStore('./zohotokens.txt'); // Must be writable on Render
      const config = new ZOHO.SDKConfigBuilder().autoRefreshFields(true).build();

      const sdkLogger = new ZOHO.Logger.Builder()
        .level(ZOHO.Levels.INFO)
        .filePath('./zoho_sdk.log')
        .build();

      await new ZOHO.InitializeBuilder()
        .user(user)
        .environment(environment)
        .token(token)
        .store(store)
        .SDKConfig(config)
        .logger(sdkLogger)
        .initialize();

      this.initialized = true;
      logger.info('✅ Zoho SDK initialized successfully');
    } catch (error) {
      helpers.handleError(error, 'Zoho SDK Initialization Failed');
    }
  }

  async createLead(leadData) {
    if (!this.initialized) throw new Error('Zoho SDK not initialized');

    try {
      const recordOperations = new ZOHO.RecordOperations();
      const moduleAPIName = 'Leads';

      const requestBody = new ZOHO.BodyWrapper();
      requestBody.setData([leadData]);

      const response = await recordOperations.createRecords(moduleAPIName, requestBody);
      const responseObject = response.getObject();
      const details = responseObject?.getData?.()[0]?.getDetails?.();

      return details;
    } catch (error) {
      helpers.handleError(error, 'Zoho Lead Creation Failed');
      throw error;
    }
  }

  async updateLead(leadId, updateData) {
    if (!this.initialized) throw new Error('Zoho SDK not initialized');

    try {
      const recordOperations = new ZOHO.RecordOperations();
      const moduleAPIName = 'Leads';

      const record = new ZOHO.Record();
      for (let key in updateData) {
        record.addFieldValue(ZOHO.Field.Leads[key], updateData[key]);
      }
      record.setId(leadId);

      const requestBody = new ZOHO.BodyWrapper();
      requestBody.setData([record]);

      const response = await recordOperations.updateRecords(moduleAPIName, requestBody);
      const responseObject = response.getObject();
      const details = responseObject?.getData?.()[0]?.getDetails?.();

      return details;
    } catch (error) {
      helpers.handleError(error, 'Zoho Lead Update Failed');
      throw error;
    }
  }

  async searchLeadByPhone(phone) {
    if (!this.initialized) throw new Error('Zoho SDK not initialized');

    try {
      const formattedPhone = helpers.formatPhoneNumber(phone);

      const recordOperations = new ZOHO.RecordOperations();
      const moduleAPIName = 'Leads';

      const paramInstance = new ZOHO.ParameterMap();
      await paramInstance.add(ZOHO.RecordOperations.Parameters.phone, formattedPhone);

      const response = await recordOperations.searchRecords(moduleAPIName, paramInstance);
      const responseObject = response.getObject();
      const data = responseObject?.getData?.()[0];

      return data || null;
    } catch (error) {
      helpers.handleError(error, 'Zoho Lead Search Failed');
      throw error;
    }
  }
}

module.exports = new ZohoApi();
