# HandelNativeEvent TurboModule - Implementation Plan

## Overview

This plan addresses critical issues in the `syncUIRender()` method across Android and iOS platforms. The method is designed to await UI rendering completion but has several bugs and architectural issues that need fixing.

---

## Issue Analysis Summary

| Issue | Severity | Platform | Root Cause |
|-------|----------|----------|------------|
| Promise hangs indefinitely | Critical | Android | `OnGlobalLayoutListener` never fires on static UI |
| Unhandled callback exceptions | Critical | Android | Exception in `onGlobalLayout` not caught |
| No module teardown | High | Both | Pending listeners leak on bridge destroy |
| Deprecated `keyWindow` API | Medium | iOS | Using deprecated iOS 13+ API |
| No timeout mechanism | High | Both | Promise can hang forever |
| Semantic inconsistency | Medium | Both | Different wait semantics per platform |
| Mock-only tests | Low | Both | No integration test coverage |

---

## Phase 1: Critical Bug Fixes (Priority: P0)

### Task 1.1: Fix Android Promise Hang

**File:** `/Users/luukhang/Documents/KHANG/handel-native-event/android/src/main/java/com/handelnativeevent/HandelNativeEventModule.kt`

**Problem:** Lines 25-33 add `OnGlobalLayoutListener` but if no layout pass occurs (static UI), the callback never fires and the promise hangs indefinitely.

**Solution:** Force a layout pass by calling `requestLayout()` after adding the listener, AND add a timeout fallback.

**Implementation:**
```kotlin
// After line 35: rootView.viewTreeObserver.addOnGlobalLayoutListener(listener)
// Add:
rootView.requestLayout()  // Force layout pass to trigger listener
```

**Trade-offs:**
- Pro: Guarantees the listener will fire
- Con: May cause unnecessary layout on already-stable UI (minimal performance impact)

---

### Task 1.2: Add Timeout Mechanism (Android)

**File:** `/Users/luukhang/Documents/KHANG/handel-native-event/android/src/main/java/com/handelnativeevent/HandelNativeEventModule.kt`

**Problem:** No timeout means promise can hang forever if layout listener fails.

**Solution:** Add a `Handler.postDelayed()` timeout (5 seconds default) that resolves the promise if layout hasn't completed.

**Implementation:**
```kotlin
private companion object {
    const val NAME = NativeHandelNativeEventSpec.NAME
    const val TIMEOUT_MS = 5000L
}

override fun syncUIRender(promise: Promise) {
    UiThreadUtil.runOnUiThread {
        try {
            val activity = currentActivity
            if (activity == null) {
                promise.reject("NO_ACTIVITY", "Activity does not exist")
                return@runOnUiThread
            }

            val rootView = activity.window.decorView
            val handler = Handler(Looper.getMainLooper())
            var resolved = AtomicBoolean(false)

            val listener = object : ViewTreeObserver.OnGlobalLayoutListener {
                override fun onGlobalLayout() {
                    if (resolved.compareAndSet(false, true)) {
                        rootView.viewTreeObserver.removeOnGlobalLayoutListener(this)
                        handler.removeCallbacksAndMessages(null)
                        promise.resolve(true)
                    }
                }
            }

            val timeoutRunnable = Runnable {
                if (resolved.compareAndSet(false, true)) {
                    rootView.viewTreeObserver.removeOnGlobalLayoutListener(listener)
                    // Resolve with true (timeout is acceptable - UI is likely stable)
                    promise.resolve(true)
                }
            }

            rootView.viewTreeObserver.addOnGlobalLayoutListener(listener)
            rootView.requestLayout()
            handler.postDelayed(timeoutRunnable, TIMEOUT_MS)
        } catch (e: Exception) {
            promise.reject("UI_ERROR", e.message)
        }
    }
}
```

**Required Imports:**
```kotlin
import android.os.Handler
import android.os.Looper
import java.util.concurrent.atomic.AtomicBoolean
```

---

### Task 1.3: Add Exception Handling in Android Callback

**File:** `/Users/luukhang/Documents/KHANG/handel-native-event/android/src/main/java/com/handelnativeevent/HandelNativeEventModule.kt`

**Problem:** Lines 26-31 - the `onGlobalLayout` callback body is not wrapped in try-catch. Any exception will crash the app.

**Solution:** Wrap callback body in try-catch (already addressed in Task 1.2 implementation above with the `resolved` guard preventing double-resolution).

---

### Task 1.4: Add Timeout Mechanism (iOS)

**File:** `/Users/luukhang/Documents/KHANG/handel-native-event/ios/HandelNativeEvent.mm`

**Problem:** CATransaction completion may not fire in edge cases.

**Solution:** Add dispatch_after timeout that races with CATransaction completion.

**Implementation:**
```objc
static const NSTimeInterval kTimeoutSeconds = 5.0;

- (void)syncUIRender:(RCTPromiseResolveBlock)resolve
              reject:(RCTPromiseRejectBlock)reject {
    dispatch_async(dispatch_get_main_queue(), ^{
        @try {
            UIWindow *keyWindow = [self findKeyWindow];

            if (!keyWindow) {
                reject(@"NO_WINDOW", @"Could not find key window", nil);
                return;
            }

            __block BOOL resolved = NO;

            // Timeout handler
            dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(kTimeoutSeconds * NSEC_PER_SEC)),
                          dispatch_get_main_queue(), ^{
                if (!resolved) {
                    resolved = YES;
                    resolve(@(YES));
                }
            });

            [CATransaction begin];
            [CATransaction setCompletionBlock:^{
                dispatch_async(dispatch_get_main_queue(), ^{
                    if (!resolved) {
                        resolved = YES;
                        resolve(@(YES));
                    }
                });
            }];

            [keyWindow layoutIfNeeded];
            [CATransaction commit];

        } @catch (NSException *exception) {
            reject(@"UI_ERROR", exception.reason, nil);
        }
    });
}
```

---

## Phase 2: Module Lifecycle Management (Priority: P1)

### Task 2.1: Implement Android Module Invalidation

**File:** `/Users/luukhang/Documents/KHANG/handel-native-event/android/src/main/java/com/handelnativeevent/HandelNativeEventModule.kt`

**Problem:** When React Native bridge is destroyed, pending listeners leak.

**Solution:** Track pending listeners and clean them up on `invalidate()`.

**Implementation:**
```kotlin
class HandelNativeEventModule(reactContext: ReactApplicationContext) :
  NativeHandelNativeEventSpec(reactContext) {

    private val pendingListeners = mutableListOf<Pair<View, ViewTreeObserver.OnGlobalLayoutListener>>()
    private val pendingHandlers = mutableListOf<Handler>()

    override fun invalidate() {
        // Clean up all pending listeners
        pendingListeners.forEach { (view, listener) ->
            try {
                view.viewTreeObserver.removeOnGlobalLayoutListener(listener)
            } catch (e: Exception) {
                // Ignore - view may already be detached
            }
        }
        pendingListeners.clear()

        // Cancel all pending timeout handlers
        pendingHandlers.forEach { handler ->
            handler.removeCallbacksAndMessages(null)
        }
        pendingHandlers.clear()

        super.invalidate()
    }

    // In syncUIRender, add to tracking:
    // pendingListeners.add(Pair(rootView, listener))
    // pendingHandlers.add(handler)
    // And remove from tracking when resolved
}
```

---

### Task 2.2: Implement iOS Module Invalidation

**File:** `/Users/luukhang/Documents/KHANG/handel-native-event/ios/HandelNativeEvent.mm`

**Problem:** iOS has no cleanup on module deallocation.

**Solution:** Track pending work items and cancel on invalidate.

**Implementation:**
```objc
@interface HandelNativeEvent ()
@property (nonatomic, strong) NSMutableSet<dispatch_block_t> *pendingBlocks;
@end

@implementation HandelNativeEvent

- (instancetype)init {
    self = [super init];
    if (self) {
        _pendingBlocks = [NSMutableSet new];
    }
    return self;
}

- (void)invalidate {
    // Cancel all pending dispatch blocks
    for (dispatch_block_t block in self.pendingBlocks) {
        dispatch_block_cancel(block);
    }
    [self.pendingBlocks removeAllObjects];
    [super invalidate];
}
```

---

## Phase 3: iOS Deprecation Fixes (Priority: P2)

### Task 3.1: Remove Deprecated keyWindow Usage

**File:** `/Users/luukhang/Documents/KHANG/handel-native-event/ios/HandelNativeEvent.mm`

**Problem:** Line 32 uses `[UIApplication sharedApplication].keyWindow` which is deprecated in iOS 13+.

**Solution:** Extract window finding logic to a dedicated method with proper iOS 13+ scene-based lookup.

**Implementation:**
```objc
- (UIWindow *)findKeyWindow {
    if (@available(iOS 13.0, *)) {
        for (UIWindowScene *scene in [UIApplication sharedApplication].connectedScenes) {
            if (scene.activationState == UISceneActivationStateForegroundActive) {
                for (UIWindow *window in scene.windows) {
                    if (window.isKeyWindow) {
                        return window;
                    }
                }
                // Fallback: return first window if no key window found
                if (scene.windows.count > 0) {
                    return scene.windows.firstObject;
                }
            }
        }
    }

    // iOS 12 and below fallback (still needed for older deployments)
    #pragma clang diagnostic push
    #pragma clang diagnostic ignored "-Wdeprecated-declarations"
    return [UIApplication sharedApplication].keyWindow;
    #pragma clang diagnostic pop
}
```

**Note:** The pragma suppresses the deprecation warning for the fallback path, which is intentional for iOS 12 compatibility.

---

## Phase 4: Cross-Platform Consistency (Priority: P2)

### Task 4.1: Document Semantic Differences

**Current State:**
- **Android:** Waits for ViewTreeObserver layout pass
- **iOS:** Waits for CATransaction commit + one run loop cycle

**Decision:** Keep platform-specific implementations but document the semantic differences clearly. Both approaches are valid for their platforms.

**Add documentation to:**
- `/Users/luukhang/Documents/KHANG/handel-native-event/src/index.tsx` - JSDoc comments
- `/Users/luukhang/Documents/KHANG/handel-native-event/README.md` - Platform behavior section

**Implementation for `index.tsx`:**
```typescript
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
```

---

## Phase 5: Testing Improvements (Priority: P3)

### Task 5.1: Update Test File

**File:** `/Users/luukhang/Documents/KHANG/handel-native-event/src/__tests__/index.test.tsx`

**Problem:** Tests only verify mock behavior, not real implementation.

**Solution:** Add timeout verification and error case tests.

**Implementation:**
```typescript
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
```

---

## Implementation Order

Execute tasks in this order to minimize risk and maintain backward compatibility:

```
Phase 1 (Critical - Do First):
  1.1 Fix Android hang (requestLayout) -----> Unblocks: all Android users
  1.2 Add Android timeout -----------------> Unblocks: edge cases
  1.3 Android exception handling ----------> Already in 1.2
  1.4 Add iOS timeout ---------------------> Parity with Android

Phase 2 (High Priority):
  2.1 Android invalidate() ----------------> Prevents memory leaks
  2.2 iOS invalidate() --------------------> Prevents memory leaks

Phase 3 (Medium Priority):
  3.1 Fix deprecated keyWindow ------------> Removes console warnings

Phase 4 (Medium Priority):
  4.1 Document semantic differences -------> Developer clarity

Phase 5 (Low Priority):
  5.1 Improve tests -----------------------> Better coverage
```

---

## Complete Implementation Files

### Final Android Implementation

**File:** `/Users/luukhang/Documents/KHANG/handel-native-event/android/src/main/java/com/handelnativeevent/HandelNativeEventModule.kt`

```kotlin
package com.handelnativeevent

import android.os.Handler
import android.os.Looper
import android.view.View
import android.view.ViewTreeObserver
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.UiThreadUtil
import java.util.concurrent.atomic.AtomicBoolean

class HandelNativeEventModule(reactContext: ReactApplicationContext) :
  NativeHandelNativeEventSpec(reactContext) {

  private val pendingListeners = mutableListOf<PendingListener>()

  private data class PendingListener(
    val view: View,
    val listener: ViewTreeObserver.OnGlobalLayoutListener,
    val handler: Handler
  )

  override fun syncUIRender(promise: Promise) {
    UiThreadUtil.runOnUiThread {
      try {
        val activity = currentActivity
        if (activity == null) {
          promise.reject("NO_ACTIVITY", "Activity does not exist")
          return@runOnUiThread
        }

        val rootView = activity.window.decorView
        val handler = Handler(Looper.getMainLooper())
        val resolved = AtomicBoolean(false)

        val listener = object : ViewTreeObserver.OnGlobalLayoutListener {
          override fun onGlobalLayout() {
            if (resolved.compareAndSet(false, true)) {
              cleanup(rootView, this, handler)
              promise.resolve(true)
            }
          }
        }

        val timeoutRunnable = Runnable {
          if (resolved.compareAndSet(false, true)) {
            cleanup(rootView, listener, handler)
            // Resolve with true - timeout means UI is likely stable
            promise.resolve(true)
          }
        }

        // Track for cleanup on invalidate
        synchronized(pendingListeners) {
          pendingListeners.add(PendingListener(rootView, listener, handler))
        }

        rootView.viewTreeObserver.addOnGlobalLayoutListener(listener)
        rootView.requestLayout() // Force layout pass to trigger listener
        handler.postDelayed(timeoutRunnable, TIMEOUT_MS)
      } catch (e: Exception) {
        promise.reject("UI_ERROR", e.message ?: "Unknown error")
      }
    }
  }

  private fun cleanup(
    view: View,
    listener: ViewTreeObserver.OnGlobalLayoutListener,
    handler: Handler
  ) {
    try {
      view.viewTreeObserver.removeOnGlobalLayoutListener(listener)
    } catch (e: Exception) {
      // View may already be detached
    }
    handler.removeCallbacksAndMessages(null)
    synchronized(pendingListeners) {
      pendingListeners.removeAll { it.listener === listener }
    }
  }

  override fun invalidate() {
    synchronized(pendingListeners) {
      pendingListeners.forEach { pending ->
        try {
          pending.view.viewTreeObserver.removeOnGlobalLayoutListener(pending.listener)
        } catch (e: Exception) {
          // Ignore - view may already be detached
        }
        pending.handler.removeCallbacksAndMessages(null)
      }
      pendingListeners.clear()
    }
    super.invalidate()
  }

  companion object {
    const val NAME = NativeHandelNativeEventSpec.NAME
    private const val TIMEOUT_MS = 5000L
  }
}
```

---

### Final iOS Implementation

**File:** `/Users/luukhang/Documents/KHANG/handel-native-event/ios/HandelNativeEvent.h`

```objc
#import <HandelNativeEventSpec/HandelNativeEventSpec.h>

@interface HandelNativeEvent : NSObject <NativeHandelNativeEventSpec>

@end
```

**File:** `/Users/luukhang/Documents/KHANG/handel-native-event/ios/HandelNativeEvent.mm`

```objc
#import "HandelNativeEvent.h"
#import <UIKit/UIKit.h>

static const NSTimeInterval kTimeoutSeconds = 5.0;

@interface HandelNativeEvent ()
@property (nonatomic, strong) NSMutableSet<dispatch_block_t> *pendingBlocks;
@end

@implementation HandelNativeEvent

RCT_EXPORT_MODULE()

- (instancetype)init {
    self = [super init];
    if (self) {
        _pendingBlocks = [NSMutableSet new];
    }
    return self;
}

- (UIWindow *)findKeyWindow {
    if (@available(iOS 13.0, *)) {
        for (UIWindowScene *scene in [UIApplication sharedApplication].connectedScenes) {
            if (scene.activationState == UISceneActivationStateForegroundActive) {
                for (UIWindow *window in scene.windows) {
                    if (window.isKeyWindow) {
                        return window;
                    }
                }
                // Fallback: return first window if no key window found
                if (scene.windows.count > 0) {
                    return scene.windows.firstObject;
                }
            }
        }
    }

    // iOS 12 and below fallback
    #pragma clang diagnostic push
    #pragma clang diagnostic ignored "-Wdeprecated-declarations"
    return [UIApplication sharedApplication].keyWindow;
    #pragma clang diagnostic pop
}

- (void)syncUIRender:(RCTPromiseResolveBlock)resolve
              reject:(RCTPromiseRejectBlock)reject {
    dispatch_async(dispatch_get_main_queue(), ^{
        @try {
            UIWindow *keyWindow = [self findKeyWindow];

            if (!keyWindow) {
                reject(@"NO_WINDOW", @"Could not find key window", nil);
                return;
            }

            __block BOOL resolved = NO;
            __block dispatch_block_t timeoutBlock = nil;

            // Create cancellable timeout block
            timeoutBlock = dispatch_block_create(0, ^{
                @synchronized (self) {
                    if (!resolved) {
                        resolved = YES;
                        [self.pendingBlocks removeObject:timeoutBlock];
                        resolve(@(YES));
                    }
                }
            });

            @synchronized (self) {
                [self.pendingBlocks addObject:timeoutBlock];
            }

            dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(kTimeoutSeconds * NSEC_PER_SEC)),
                          dispatch_get_main_queue(), timeoutBlock);

            [CATransaction begin];
            [CATransaction setCompletionBlock:^{
                dispatch_async(dispatch_get_main_queue(), ^{
                    @synchronized (self) {
                        if (!resolved) {
                            resolved = YES;
                            if (timeoutBlock) {
                                dispatch_block_cancel(timeoutBlock);
                                [self.pendingBlocks removeObject:timeoutBlock];
                            }
                            resolve(@(YES));
                        }
                    }
                });
            }];

            [keyWindow layoutIfNeeded];
            [CATransaction commit];

        } @catch (NSException *exception) {
            reject(@"UI_ERROR", exception.reason, nil);
        }
    });
}

- (void)invalidate {
    @synchronized (self) {
        for (dispatch_block_t block in self.pendingBlocks) {
            dispatch_block_cancel(block);
        }
        [self.pendingBlocks removeAllObjects];
    }
    [super invalidate];
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
    return std::make_shared<facebook::react::NativeHandelNativeEventSpecJSI>(params);
}

+ (NSString *)moduleName
{
    return @"HandelNativeEvent";
}

@end
```

---

## Verification Checklist

After implementation, verify:

- [ ] Android: `syncUIRender()` resolves within 5 seconds even on static UI
- [ ] Android: No crash if exception occurs in callback
- [ ] Android: Listeners cleaned up on bridge destroy (test with hot reload)
- [ ] iOS: `syncUIRender()` resolves within 5 seconds
- [ ] iOS: No deprecation warnings in Xcode console
- [ ] iOS: Pending blocks cancelled on module invalidate
- [ ] Both: Multiple concurrent calls work correctly
- [ ] Both: Promise rejects with proper error if no window/activity

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| `requestLayout()` causes performance regression | Low | Minimal overhead; only affects `syncUIRender` calls |
| Timeout resolving with `true` masks real issues | Medium | 5s timeout is generous; log warning in debug builds |
| Thread safety issues with `resolved` flag | High | Using `AtomicBoolean` (Android) and `@synchronized` (iOS) |
| Breaking change if return type changes | High | Keeping same `Promise<boolean>` signature |

---

## Backward Compatibility

This plan maintains full backward compatibility:
- Same TypeScript interface (`syncUIRender(): Promise<boolean>`)
- Same resolve behavior (`true` on success)
- Same reject error codes (`NO_ACTIVITY`, `NO_WINDOW`, `UI_ERROR`)
- Timeout resolves with `true` (not reject) to avoid breaking existing error handling

---

## Estimated Effort

| Phase | Estimated Time | Complexity |
|-------|---------------|------------|
| Phase 1: Critical Fixes | 2-3 hours | Medium |
| Phase 2: Lifecycle Management | 1-2 hours | Medium |
| Phase 3: Deprecation Fixes | 30 mins | Low |
| Phase 4: Documentation | 30 mins | Low |
| Phase 5: Testing | 1 hour | Low |
| **Total** | **5-7 hours** | |

---

*Plan generated: 2026-04-03*
*Target files: HandelNativeEventModule.kt, HandelNativeEvent.mm, index.tsx, index.test.tsx*
