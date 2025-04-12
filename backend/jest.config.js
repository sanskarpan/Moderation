module.exports = {
  testEnvironment: 'node',

  testMatch: [
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js'
  ],

  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/'
  ],

  roots: [
    '<rootDir>/src'
  ],

  collectCoverage: true,
  coverageDirectory: 'coverage',
  coveragePathIgnorePatterns: [
    '/node_modules/'
  ],
  coverageProvider: 'v8',
  coverageReporters: [
    'json',
    'text',
    'lcov',
    'clover'
  ],

  globals: {
    'NODE_ENV': 'test'
  },

  maxWorkers: '50%',
  reporters: ['default'],
  resetMocks: true,
  resetModules: false,
  restoreMocks: true,

  setupFiles: [],
  setupFilesAfterEnv: [],
  testTimeout: 30000,
  transform: {}
};
