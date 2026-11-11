const fs = require('fs');

// app.json stays the source of truth. This adds the Firebase Android config file (needed for push on Android),
// which is not committed: EAS builds get it from the GOOGLE_SERVICES_JSON file secret, local builds from ./google-services.json.
module.exports = ({ config }) => {
  const file = process.env.GOOGLE_SERVICES_JSON ?? './google-services.json';
  return {
    ...config,
    android: { ...config.android, ...(fs.existsSync(file) ? { googleServicesFile: file } : {}) },
  };
};
