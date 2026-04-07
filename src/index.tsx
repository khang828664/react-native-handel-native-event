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

/**
 * Kích hoạt hoặc tắt Sustained Performance Mode trên Android.
 *
 * Khi thiết bị cắm sạc, Android có thể tự động giảm tần số CPU/GPU
 * để tránh quá nhiệt. `SUSTAINED_PERFORMANCE_MODE` yêu cầu hệ thống
 * duy trì hiệu năng ổn định, tránh bị throttle bất ngờ.
 *
 * @param enable - `true` để bật, `false` để tắt.
 * @returns Promise resolves `true` nếu thành công, `false` nếu không được hỗ trợ (iOS hoặc API < 24).
 *
 * @remarks
 * - **Android**: Yêu cầu API 24+. Chỉ có hiệu lực khi thiết bị cắm sạc.
 * - **iOS**: Luôn resolve `false` (không hỗ trợ).
 *
 * @example
 * ```typescript
 * // Bật khi app foreground + đang sạc
 * await setSustainedPerformanceMode(true);
 * // Tắt khi app background
 * await setSustainedPerformanceMode(false);
 * ```
 */
export function setSustainedPerformanceMode(enable: boolean): Promise<boolean> {
  return HandelNativeEvent.setSustainedPerformanceMode(enable);
}

/**
 * Giữ màn hình luôn sáng (FLAG_KEEP_SCREEN_ON).
 *
 * Ngăn màn hình tắt tự động, đảm bảo GPU/CPU không bị hạ ưu tiên
 * do hệ thống nghĩ thiết bị đang idle.
 *
 * @param enable - `true` để bật, `false` để tắt.
 * @returns Promise resolves `true` nếu thành công.
 *
 * @remarks
 * - **Android**: Thao tác trên `Window.FLAG_KEEP_SCREEN_ON` của Activity hiện tại.
 * - **iOS**: Gọi `UIApplication.isIdleTimerDisabled` tương đương.
 *
 * @example
 * ```typescript
 * await setKeepScreenOn(true);   // Màn hình không tắt
 * await setKeepScreenOn(false);  // Khôi phục hành vi mặc định
 * ```
 */
export function setKeepScreenOn(enable: boolean): Promise<boolean> {
  return HandelNativeEvent.setKeepScreenOn(enable);
}

/**
 * Kích hoạt chế độ Max Power cho thiết bị cắm điện trực tiếp (AC-powered).
 *
 * Gộp 3 tối ưu trong một lần gọi:
 * 1. Nâng thread priority lên `THREAD_PRIORITY_URGENT_DISPLAY`
 * 2. Ghim thread vào Big cores (CPU affinity qua JNI)
 * 3. Bật `SUSTAINED_PERFORMANCE_MODE` + `FLAG_KEEP_SCREEN_ON`
 *
 * @returns Promise resolves chuỗi mô tả kết quả (số core được ghim).
 *
 * @remarks
 * - **Android**: Yêu cầu API 24+. `SUSTAINED_PERFORMANCE_MODE` chỉ hoạt động khi cắm sạc.
 * - **iOS**: Chỉ bật `idleTimerDisabled` — không có CPU affinity API ở user space.
 *
 * @example
 * ```typescript
 * const result = await activateMaxPower();
 * // "Activated on 4 big core(s): [4, 5, 6, 7]"
 * ```
 */
export function activateMaxPower(): Promise<string> {
  return HandelNativeEvent.activateMaxPower();
}

/**
 * Tắt chế độ Max Power, khôi phục hành vi mặc định của hệ thống.
 *
 * Hoàn tác toàn bộ thay đổi của `activateMaxPower()`:
 * - Reset thread priority về mặc định
 * - Bỏ CPU affinity (cho phép scheduler tự điều phối)
 * - Tắt `SUSTAINED_PERFORMANCE_MODE` + `FLAG_KEEP_SCREEN_ON`
 *
 * @returns Promise resolves `true` nếu thành công.
 *
 * @example
 * ```typescript
 * // Gọi khi app vào background hoặc tháo nguồn
 * await deactivateMaxPower();
 * ```
 */
export function deactivateMaxPower(): Promise<boolean> {
  return HandelNativeEvent.deactivateMaxPower();
}
