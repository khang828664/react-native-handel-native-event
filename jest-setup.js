// Mock cho native module HandelNativeEvent
jest.mock('./src/NativeHandelNativeEvent', () => ({
  __esModule: true,
  default: {
    multiply: jest.fn((a, b) => a * b),
    syncUIRender: jest.fn(() => Promise.resolve(true)),
  },
}));
