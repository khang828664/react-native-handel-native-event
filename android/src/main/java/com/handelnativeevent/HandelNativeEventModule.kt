package com.handelnativeevent

import android.view.View
import android.view.ViewTreeObserver
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.UiThreadUtil

class HandelNativeEventModule(reactContext: ReactApplicationContext) :
  NativeHandelNativeEventSpec(reactContext) {

  override fun syncUIRender(promise: Promise) {
    // Luôn thực hiện logic UI trên UI Thread của Android
    UiThreadUtil.runOnUiThread {
      try {
        val activity = currentActivity
        if (activity == null) {
          promise.reject("NO_ACTIVITY", "Activity không tồn tại")
          return@runOnUiThread
        }

        val rootView = activity.window.decorView

        // Sử dụng ViewTreeObserver để lắng nghe sự kiện Render/Layout hoàn tất
        val listener = object : ViewTreeObserver.OnGlobalLayoutListener {
          override fun onGlobalLayout() {
            // Quan trọng: Gỡ bỏ ngay lập tức để tránh leak memory
            rootView.viewTreeObserver.removeOnGlobalLayoutListener(this)

            // Trả kết quả về cho React Native sau khi UI đã ổn định
            promise.resolve(true)
          }
        }

        rootView.viewTreeObserver.addOnGlobalLayoutListener(listener)
      } catch (e: Exception) {
        promise.reject("UI_ERROR", e.message)
      }
    }
  }

  companion object {
    const val NAME = NativeHandelNativeEventSpec.NAME
  }
}
