import { syncUIRender } from '../index';

describe('HandelNativeEvent', () => {
  describe('syncUIRender', () => {
    it('should resolve with true on successful UI render', async () => {
      const result = await syncUIRender();
      expect(result).toBe(true);
    });

    it('should be callable multiple times', async () => {
      const result1 = await syncUIRender();
      const result2 = await syncUIRender();

      expect(result1).toBe(true);
      expect(result2).toBe(true);
    });

    it('should return a Promise', () => {
      const result = syncUIRender();
      expect(result).toBeInstanceOf(Promise);
    });
  });
});
