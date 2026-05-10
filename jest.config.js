/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverageFrom: [
    'miniprogram/pages/record/record.js',
    'cloudfunctions/uploadAudio/index.js',
    'cloudfunctions/callXunfei/index.js',
    'cloudfunctions/callClaude/index.js'
  ],
  coverageDirectory: 'coverage',
  transform: {},
  moduleFileExtensions: ['js', 'json']
};
