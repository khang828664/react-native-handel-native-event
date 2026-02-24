#import "HandelNativeEvent.h"
#import <UIKit/UIKit.h>

@implementation HandelNativeEvent

RCT_EXPORT_MODULE()

- (void)syncUIRender:(RCTPromiseResolveBlock)resolve
              reject:(RCTPromiseRejectBlock)reject {
    // Đảm bảo chạy trên main thread (UI thread của iOS)
    dispatch_async(dispatch_get_main_queue(), ^{
        @try {
            UIWindow *keyWindow = nil;

            // Tìm key window từ các scene (iOS 13+)
            if (@available(iOS 13.0, *)) {
                for (UIWindowScene *scene in [UIApplication sharedApplication].connectedScenes) {
                    if (scene.activationState == UISceneActivationStateForegroundActive) {
                        for (UIWindow *window in scene.windows) {
                            if (window.isKeyWindow) {
                                keyWindow = window;
                                break;
                            }
                        }
                    }
                    if (keyWindow) break;
                }
            }

            // Fallback cho iOS < 13
            if (!keyWindow) {
                keyWindow = [UIApplication sharedApplication].keyWindow;
            }

            if (!keyWindow) {
                reject(@"NO_WINDOW", @"Không tìm thấy key window", nil);
                return;
            }

            // Sử dụng CATransaction để lắng nghe khi rendering hoàn tất
            [CATransaction begin];
            [CATransaction setCompletionBlock:^{
                // Đợi thêm một run loop để đảm bảo layout hoàn toàn xong
                dispatch_async(dispatch_get_main_queue(), ^{
                    resolve(@(YES));
                });
            }];

            // Trigger layout nếu cần
            [keyWindow layoutIfNeeded];

            [CATransaction commit];

        } @catch (NSException *exception) {
            reject(@"UI_ERROR", exception.reason, nil);
        }
    });
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
