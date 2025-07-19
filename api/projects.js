const OggoApiClient = require('./oggoApiClient');

// Initialize client with env vars
const client = new OggoApiClient(
  process.env.OGGO_CONSUMER_KEY,
  process.env.OGGO_CONSUMER_SECRET,
  process.env.OGGO_API_BASE_URL
);

// Helper to create any project type
const createProject = async (projectType, data) => {
  return client.request({
    endpoint: `/project/${projectType}`,
    data,
  });
};

module.exports = { createProject };