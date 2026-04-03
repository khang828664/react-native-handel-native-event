import { syncUIRender } from '../index';

// Mock setup
jest.mock('../NativeHandelNativeEvent', () => ({
  syncUIRender: jest.fn(),
}));

import HandelNativeEvent from '../NativeHandelNativeEvent';

const mockSyncUIRender = HandelNativeEvent.syncUIRender as jest.Mock;

describe('HandelNativeEvent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('syncUIRender', () => {
    it('should resolve with true on successful UI render', async () => {
      mockSyncUIRender.mockResolvedValueOnce(true);

      const result = await syncUIRender();

      expect(result).toBe(true);
      expect(mockSyncUIRender).toHaveBeenCalledTimes(1);
    });

    it('should be callable multiple times sequentially', async () => {
      mockSyncUIRender.mockResolvedValue(true);

      const result1 = await syncUIRender();
      const result2 = await syncUIRender();

      expect(result1).toBe(true);
      expect(result2).toBe(true);
      expect(mockSyncUIRender).toHaveBeenCalledTimes(2);
    });

    it('should return a Promise', () => {
      mockSyncUIRender.mockResolvedValueOnce(true);

      const result = syncUIRender();

      expect(result).toBeInstanceOf(Promise);
    });

    it('should propagate rejection from native module', async () => {
      const error = new Error('NO_ACTIVITY');
      mockSyncUIRender.mockRejectedValueOnce(error);

      await expect(syncUIRender()).rejects.toThrow('NO_ACTIVITY');
    });

    it('should handle concurrent calls independently', async () => {
      mockSyncUIRender.mockResolvedValue(true);

      const [result1, result2, result3] = await Promise.all([
        syncUIRender(),
        syncUIRender(),
        syncUIRender(),
      ]);

      expect(result1).toBe(true);
      expect(result2).toBe(true);
      expect(result3).toBe(true);
      expect(mockSyncUIRender).toHaveBeenCalledTimes(3);
    });
  });
});
