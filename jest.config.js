module.exports = {
  collectCoverage: true,
  setupFiles: ['<rootDir>/jest.setup.js'],
  preset: 'ts-jest',
  collectCoverageFrom: [
    '<rootDir>/**/*.ts'
  ],
  testMatch: [
    '<rootDir>//**/*.test.ts'
  ],
  transform: {
    '^.+\\.js?$': '<rootDir>/node_modules/babel-jest'
  },
  testPathIgnorePatterns: [
    '/node_modules/',
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
  ]
};
