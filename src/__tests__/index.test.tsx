import { multiply, syncUIRender } from '../index';

describe('HandelNativeEvent', () => {
  describe('multiply', () => {
    it('should multiply two numbers correctly', () => {
      expect(multiply(3, 7)).toBe(21);
      expect(multiply(5, 4)).toBe(20);
      expect(multiply(-2, 3)).toBe(-6);
    });

    it('should handle zero multiplication', () => {
      expect(multiply(0, 5)).toBe(0);
      expect(multiply(10, 0)).toBe(0);
    });

    it('should handle decimal numbers', () => {
      expect(multiply(2.5, 4)).toBe(10);
      expect(multiply(1.5, 1.5)).toBe(2.25);
    });
  });

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
