import HandelNativeEvent from './NativeHandelNativeEvent';

export function multiply(a: number, b: number): number {
  return HandelNativeEvent.multiply(a, b);
}

export function syncUIRender(): Promise<boolean> {
  return HandelNativeEvent.syncUIRender();
}
