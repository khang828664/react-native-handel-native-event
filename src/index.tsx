import HandelNativeEvent from './NativeHandelNativeEvent';

export function syncUIRender(): Promise<boolean> {
  return HandelNativeEvent.syncUIRender();
}
