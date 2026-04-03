import HandelNativeEvent from './NativeHandelNativeEvent';

/**
 * Waits for the current UI rendering cycle to complete.
 *
 * @returns Promise that resolves to `true` when rendering is complete.
 *
 * @remarks
 * Platform-specific behavior:
 * - **Android**: Waits for ViewTreeObserver.OnGlobalLayoutListener callback
 * - **iOS**: Waits for CATransaction completion + one run loop cycle
 *
 * Both platforms have a 5-second timeout that resolves with `true` if
 * the native callback doesn't fire (assumes UI is stable).
 *
 * @example
 * ```typescript
 * await syncUIRender();
 * // UI is now stable, safe to take screenshot or measure
 * ```
 */
export function syncUIRender(): Promise<boolean> {
  return HandelNativeEvent.syncUIRender();
}
