// Security-rules tests run in plain Node against the Firebase emulators (see `npm run test:rules`).
module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/rules/**/*.test.js'],
  testTimeout: 20000,
};
