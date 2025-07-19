const ZOHO = require('@zohocrm/nodejs-sdk');
const logger = require('../utils/logger');
const helpers = require('../utils/helpers');
const fs = require('fs');
const path = require('path');

class ZohoApi {
  constructor() {
    this.initialized = false;
    this.tokenStorePath = path.join(__dirname, '../../zohotokens.txt');
    this.initialize();
  }

  async initialize() {
    try {
      // 1. Ensure token store file exists (Render requires specific paths)
      if (!fs.existsSync(this.tokenStorePath)) {
        fs.writeFileSync(this.tokenStorePath, '{}');
      }

      // 2. Configure SDK
      const user = new ZOHO.UserSignature(process.env.ZOHO_CRM_DEFAULT_ACCOUNT);
      const environment = ZOHO.USDataCenter.PRODUCTION();

      const token = new ZOHO.OAuthBuilder()
        .clientId(process.env.ZOHO_CLIENT_ID)
        .clientSecret(process.env.ZOHO_CLIENT_SECRET)
        .refreshToken(process.env.ZOHO_REFRESH_TOKEN)
        .redirectURL('https://aircall-integration.onrender.com/zoho-callback')
        .build();

      // 3. Use in-memory store for Render (persistent storage not available)
      const store = new class {
        async getToken(user, token) {
          try {
            const data = fs.readFileSync(this.tokenStorePath);
            return JSON.parse(data);
          } catch (e) {
            return null;
          }
        }
        async saveToken(user, token) {
          fs.writeFileSync(this.tokenStorePath, JSON.stringify(token));
        }
      };

      // 4. Initialize with minimal config
      await new ZOHO.InitializeBuilder()
        .user(user)
        .environment(environment)
        .token(token)
        .store(store)
        .initialize();

      this.initialized = true;
      logger.info('✅ Zoho SDK initialized successfully');
    } catch (error) {
      helpers.handleError(error, 'Zoho SDK Initialization Failed');
      throw error;
    }
  }

  // Simplified createLead for testing
  async createTestLead() {
    if (!this.initialized) await this.initialize();
    
    const leadData = new ZOHO.Record();
    leadData.addFieldValue(ZOHO.Field.Leads.Last_Name, "Test Lead");
    leadData.addFieldValue(ZOHO.Field.Leads.Company, "Test Company");
    
    try {
      const recordOperations = new ZOHO.RecordOperations();
      const response = await recordOperations.createRecords('Leads', new ZOHO.BodyWrapper().setData([leadData]));
      
      if (response.getObject().getData()[0].getStatus() === "success") {
        return { success: true, id: response.getObject().getData()[0].getDetails().getId() };
      }
      throw new Error('Lead creation failed');
    } catch (error) {
      helpers.handleError(error, 'Zoho Test Lead Creation Failed');
      throw error;
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
