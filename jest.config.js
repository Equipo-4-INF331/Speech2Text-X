export default {
  testEnvironment: 'node',
  transformIgnorePatterns: [
    "node_modules/(?!uuid|@aws-sdk|@smithy)",
  ],
  testMatch: [
    "**/back/**/__tests__/**/*.[jt]s?(x)",
    "**/back/**/?(*.)+(spec|test).[jt]s?(x)"
  ],
  testPathIgnorePatterns: [
    "/node_modules/",
    "/front/"
  ],
  collectCoverageFrom: [
    'back/**/*.js',
    '!back/index.js',
    '!back/__tests__/**',
  ],
};