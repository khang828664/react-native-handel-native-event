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
