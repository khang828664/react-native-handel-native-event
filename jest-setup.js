// Mock cho native module HandelNativeEvent
jest.mock('./src/NativeHandelNativeEvent', () => ({
  __esModule: true,
  default: {
    syncUIRender: jest.fn(() => Promise.resolve(true)),
  },
}));
