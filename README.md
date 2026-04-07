# react-native-handel-native-event

React Native TurboModule cung cấp các API native để tối ưu hiệu năng UI và CPU, được thiết kế đặc biệt cho thiết bị **AC-powered** (POS, kiosk, màn hình checkout) — nơi cần hiệu năng ổn định, không bị CPU throttle.

## Tính năng

- `syncUIRender` — Đồng bộ UI render cycle giữa Native và JS
- `setKeepScreenOn` — Giữ màn hình luôn sáng
- `setSustainedPerformanceMode` — Duy trì hiệu năng CPU/GPU ổn định (Android)
- `activateMaxPower` — Kích hoạt toàn bộ tối ưu hiệu năng trong 1 lần gọi
- `deactivateMaxPower` — Hoàn tác, khôi phục hành vi mặc định
- Hỗ trợ New Architecture (TurboModules)
- TypeScript support, Promise-based API
- JNI C++ layer cho CPU Affinity (tự động phát hiện Big cores)

---

## Yêu cầu

| | Phiên bản tối thiểu |
|---|---|
| React Native | 0.73+ (New Architecture) |
| Android API | 24+ (Android 7.0) |
| iOS | 13.0+ |
| NDK | r21+ (cho JNI layer) |

---

## Cài đặt

```sh
npm install react-native-handel-native-event
# hoặc
yarn add react-native-handel-native-event
# hoặc
bun add react-native-handel-native-event
```

### iOS

```sh
cd ios && pod install
```

### Android

Không cần cấu hình thêm. CMake tự động biên dịch JNI layer khi build.

---

## API Reference

### `syncUIRender(): Promise<boolean>`

Đợi cho đến khi UI render cycle hiện tại hoàn tất. Hữu ích trước khi chụp screenshot hoặc đo kích thước view.

**Returns:** `true` khi render xong  
**Throws:** `NO_ACTIVITY` (Android), `NO_WINDOW` (iOS), `UI_ERROR`  
**Timeout:** 5 giây (tự resolve `true` nếu không có layout pass)

```typescript
import { syncUIRender } from 'react-native-handel-native-event';

// Đợi UI ổn định trước khi chụp ảnh
await syncUIRender();
const uri = await captureRef(viewRef);
```

**Platform:**
- Android: `ViewTreeObserver.OnGlobalLayoutListener`
- iOS: `CATransaction` completion block

---

### `setKeepScreenOn(enable: boolean): Promise<boolean>`

Giữ màn hình luôn sáng, ngăn thiết bị vào idle.

```typescript
import { setKeepScreenOn } from 'react-native-handel-native-event';

await setKeepScreenOn(true);   // Màn hình không tắt
await setKeepScreenOn(false);  // Khôi phục mặc định
```

**Platform:**
- Android: `Window.FLAG_KEEP_SCREEN_ON`
- iOS: `UIApplication.isIdleTimerDisabled`

---

### `setSustainedPerformanceMode(enable: boolean): Promise<boolean>`

Yêu cầu Android duy trì hiệu năng CPU/GPU ổn định, tránh throttle nhiệt bất ngờ.

```typescript
import { setSustainedPerformanceMode } from 'react-native-handel-native-event';

await setSustainedPerformanceMode(true);
await setSustainedPerformanceMode(false);
```

**Lưu ý quan trọng:**
- Chỉ có hiệu lực khi thiết bị **đang cắm điện AC**
- Yêu cầu Android API 24+. Tự động resolve `false` nếu API < 24
- iOS luôn resolve `false` (không có API tương đương)

---

### `activateMaxPower(): Promise<string>`

Kích hoạt toàn bộ tối ưu hiệu năng trong một lần gọi, gộp 3 bước:

1. Nâng **Thread Priority** lên `THREAD_PRIORITY_URGENT_DISPLAY`
2. **CPU Affinity** (JNI) — ghim thread vào Big cores (tự động phát hiện)
3. Bật `FLAG_KEEP_SCREEN_ON` + `SUSTAINED_PERFORMANCE_MODE`

**Returns:** Chuỗi mô tả kết quả

```typescript
import { activateMaxPower } from 'react-native-handel-native-event';

const result = await activateMaxPower();
// Android: "Activated on 4 big core(s): [4, 5, 6, 7]"
// iOS:     "Activated (iOS: idleTimerDisabled=YES)"
```

---

### `deactivateMaxPower(): Promise<boolean>`

Hoàn tác toàn bộ thay đổi của `activateMaxPower()`.

- Reset thread priority về mặc định
- Bỏ CPU affinity (scheduler tự điều phối lại)
- Xóa `FLAG_KEEP_SCREEN_ON` + tắt `SUSTAINED_PERFORMANCE_MODE`

```typescript
import { deactivateMaxPower } from 'react-native-handel-native-event';

await deactivateMaxPower();
```

---

## Ví dụ thực tế

### Hook cho màn hình POS / Kiosk

```typescript
import { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import {
  activateMaxPower,
  deactivateMaxPower,
} from 'react-native-handel-native-event';

export function usePerformanceBoost() {
  useEffect(() => {
    activateMaxPower().catch(console.error);

    const subscription = AppState.addEventListener(
      'change',
      (state: AppStateStatus) => {
        if (state === 'active') {
          activateMaxPower().catch(console.error);
        } else {
          deactivateMaxPower().catch(console.error);
        }
      }
    );

    return () => {
      subscription.remove();
      deactivateMaxPower().catch(console.error);
    };
  }, []);
}
```

### Chụp màn hình / in hoá đơn

```typescript
import { syncUIRender } from 'react-native-handel-native-event';

async function printReceipt() {
  setOverlayVisible(false);

  // Đảm bảo UI đã update xong trước khi capture
  await syncUIRender();

  const uri = await captureRef(receiptRef);
  await PrinterSDK.print(uri);
}
```

### Kết hợp đầy đủ cho màn hình Checkout

```typescript
import { useEffect } from 'react';
import {
  activateMaxPower,
  deactivateMaxPower,
  syncUIRender,
} from 'react-native-handel-native-event';

export function CheckoutScreen() {
  useEffect(() => {
    activateMaxPower();
    return () => { deactivateMaxPower(); };
  }, []);

  async function handleConfirm() {
    await syncUIRender();
    // Xử lý thanh toán sau khi UI ổn định
    await processPayment();
  }
}
```

### Mock trong Jest

```typescript
jest.mock('react-native-handel-native-event', () => ({
  syncUIRender: jest.fn(() => Promise.resolve(true)),
  setKeepScreenOn: jest.fn(() => Promise.resolve(true)),
  setSustainedPerformanceMode: jest.fn(() => Promise.resolve(true)),
  activateMaxPower: jest.fn(() =>
    Promise.resolve('Activated on 4 big core(s): [4, 5, 6, 7]')
  ),
  deactivateMaxPower: jest.fn(() => Promise.resolve(true)),
}));
```

---

## Chi tiết kỹ thuật — CPU Affinity (Android)

Module dùng JNI gọi `sched_setaffinity` từ C++ để ghim calling thread vào Big cores.

**Cơ chế phát hiện Big cores** — đọc `cpuinfo_max_freq`:

```
/sys/devices/system/cpu/cpu0/cpufreq/cpuinfo_max_freq  →  1804800  (Little core)
/sys/devices/system/cpu/cpu4/cpufreq/cpuinfo_max_freq  →  2841600  (Big core)
/sys/devices/system/cpu/cpu7/cpufreq/cpuinfo_max_freq  →  3187200  (Prime core) ← ghim vào đây
```

Các core có `cpuinfo_max_freq` cao nhất được chọn. Fallback về `[0]` nếu không đọc được file.

**Build flags:** `-O3 -fno-rtti -fno-exceptions`  
**ABI:** `arm64-v8a`, `x86_64`

---

## Tích hợp Old Architecture

Nếu dùng **Old Architecture**, đăng ký package thủ công trong `MainApplication`:

```java
import com.handelnativeevent.HandelNativeEventPackage;

@Override
protected List<ReactPackage> getPackages() {
  return Arrays.asList(
    new MainReactPackage(),
    new HandelNativeEventPackage()
  );
}
```

**New Architecture (TurboModules)** — tự động qua codegen, không cần thêm.

---

## License

MIT
