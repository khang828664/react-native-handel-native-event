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
export declare function syncUIRender(): Promise<boolean>;
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
export declare function setSustainedPerformanceMode(enable: boolean): Promise<boolean>;
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
export declare function setKeepScreenOn(enable: boolean): Promise<boolean>;
//# sourceMappingURL=index.d.ts.map