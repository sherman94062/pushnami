module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  verbose: true,
  // Separate test suites can be run with --testPathPattern
  // e.g. npm test -- --testPathPattern=unit
  //      npm test -- --testPathPattern=integration
};
