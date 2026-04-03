// Mock for native module HandelNativeEvent
// This is overridden in individual test files if needed
jest.mock('./src/NativeHandelNativeEvent', () => ({
  __esModule: true,
  default: {
    syncUIRender: jest.fn(() => Promise.resolve(true)),
  },
}));
