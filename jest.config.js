module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // Yeh file har test se pehle run hogi
  setupFilesAfterEnv: ['./src/tests/setup.ts'],
  // Yeh batata hai ki test files kahan milengi
  testMatch: ['**/?(*.)+(spec|test).[jt]s?(x)'],
};