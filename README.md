# react-native-handel-native-event

React Native TurboModule giúp đồng bộ UI rendering giữa Native và JavaScript thread. Thư viện này hỗ trợ React Native New Architecture (TurboModules) và hoạt động trên cả iOS và Android.

## Tính năng

- ✅ Đồng bộ UI render giữa Native và JS
- ✅ Hỗ trợ React Native New Architecture (TurboModules)
- ✅ Hoạt động trên iOS & Android
- ✅ TypeScript support
- ✅ Promise-based API
- ✅ Zero dependencies

## Yêu cầu

- React Native >= 0.70.0
- iOS >= 13.0
- Android minSdkVersion >= 21

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

Không cần cấu hình thêm, auto-linking sẽ xử lý.

## Sử dụng

### Import

```typescript
import { syncUIRender } from 'react-native-handel-native-event';
```

### Sync UI Render

Đồng bộ UI rendering - đợi cho đến khi native UI hoàn tất render/layout:

```typescript
// Sử dụng cơ bản
async function handleAction() {
  await syncUIRender();
  console.log('UI đã render xong!');
}

// Use case thực tế: Đợi UI ổn định trước khi thực hiện action
import { syncUIRender } from 'react-native-handel-native-event';

const MyComponent = () => {
  const handleComplexUpdate = async () => {
    // 1. Update state/props
    setLoading(true);

    // 2. Đợi UI render xong
    await syncUIRender();

    // 3. Thực hiện action sau khi UI ổn định
    performHeavyOperation();
    setLoading(false);
  };

  return <Button onPress={handleComplexUpdate}>Complex Action</Button>;
};
```

### Use Cases

**1. Measurement sau khi render**

```typescript
const measureAfterRender = async () => {
  // Trigger state update
  setShowModal(true);

  // Đợi UI render
  await syncUIRender();

  // Lấy measurements chính xác
  modalRef.current?.measure((x, y, width, height) => {
    console.log('Modal dimensions:', { width, height });
  });
};
```

**2. Animation sequence**

```typescript
const animateSequence = async () => {
  // Start animation
  Animated.timing(fadeAnim, {
    /* ... */
  }).start();

  // Đợi frame tiếp theo
  await syncUIRender();

  // Start animation thứ 2
  Animated.timing(slideAnim, {
    /* ... */
  }).start();
};
```

**3. Screenshot/Capture**

```typescript
const captureScreen = async () => {
  // Update UI
  setOverlayVisible(false);

  // Đợi UI update xong
  await syncUIRender();

  // Capture screenshot
  const uri = await captureRef(viewRef);
  return uri;
};
```

**4. Testing & E2E**

```typescript
// Trong tests
it('should display data after loading', async () => {
  fetchData();

  // Đợi UI render data
  await syncUIRender();

  expect(screen.getByText('Data loaded')).toBeTruthy();
});
```

## API Reference

### `syncUIRender(): Promise<boolean>`

Đồng bộ UI render - đợi cho đến khi native UI hoàn tất layout pass.

**Returns:** Promise resolve với `true` khi UI render xong

**Throws:**

- `NO_ACTIVITY` (Android): Activity không tồn tại
- `NO_WINDOW` (iOS): Không tìm thấy key window
- `UI_ERROR`: Lỗi khác trong quá trình render

**Platform specifics:**

- **iOS**: Sử dụng `CATransaction` để lắng nghe render completion
- **Android**: Sử dụng `ViewTreeObserver.OnGlobalLayoutListener`

## Testing

Thư viện đã được cấu hình sẵn mock cho Jest/Bun:

```typescript
// Mock tự động hoạt động
import { syncUIRender } from 'react-native-handel-native-event';

test('should sync UI', async () => {
  const result = await syncUIRender();
  expect(result).toBe(true);
});
```

Để custom mock:

```typescript
jest.mock('react-native-handel-native-event', () => ({
  syncUIRender: jest.fn(() => Promise.resolve(true)),
}));
```

## Ví dụ

Xem [example app](example/src/App.tsx) để biết cách sử dụng đầy đủ.

Chạy example:

```sh
# iOS
yarn example ios

# Android
yarn example android
```

## Contributing

- [Development workflow](CONTRIBUTING.md#development-workflow)
- [Sending a pull request](CONTRIBUTING.md#sending-a-pull-request)
- [Code of conduct](CODE_OF_CONDUCT.md)

## License

MIT

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
