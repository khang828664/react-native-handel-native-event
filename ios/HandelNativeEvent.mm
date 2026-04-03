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
