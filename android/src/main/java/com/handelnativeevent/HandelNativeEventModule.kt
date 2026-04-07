package com.handelnativeevent

import android.content.Context
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.PowerManager
import android.os.Process
import android.view.View
import android.view.ViewTreeObserver
import android.view.WindowManager
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.UiThreadUtil
import java.io.BufferedReader
import java.io.FileReader
import java.util.concurrent.atomic.AtomicBoolean

class HandelNativeEventModule(reactContext: ReactApplicationContext) :
  NativeHandelNativeEventSpec(reactContext) {

  // JNI — compiled từ performance-boost.cpp
  private external fun nativeSetAffinity(coreIds: IntArray): Boolean
  private external fun nativeResetAffinity(): Boolean

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

  override fun setSustainedPerformanceMode(enable: Boolean, promise: Promise) {
    UiThreadUtil.runOnUiThread {
      try {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.N) {
          // API < 24: không hỗ trợ
          promise.resolve(false)
          return@runOnUiThread
        }
        val activity = currentActivity
        if (activity == null) {
          promise.reject("NO_ACTIVITY", "Activity does not exist")
          return@runOnUiThread
        }
        activity.window.setSustainedPerformanceMode(enable)
        promise.resolve(true)
      } catch (e: Exception) {
        promise.reject("PERF_ERROR", e.message ?: "Unknown error")
      }
    }
  }

  override fun setKeepScreenOn(enable: Boolean, promise: Promise) {
    UiThreadUtil.runOnUiThread {
      try {
        val activity = currentActivity
        if (activity == null) {
          promise.reject("NO_ACTIVITY", "Activity does not exist")
          return@runOnUiThread
        }
        if (enable) {
          activity.window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        } else {
          activity.window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        }
        promise.resolve(true)
      } catch (e: Exception) {
        promise.reject("SCREEN_ERROR", e.message ?: "Unknown error")
      }
    }
  }

  override fun activateMaxPower(promise: Promise) {
    try {
      // 1. Nâng thread priority lên mức cao nhất cho UI rendering
      Process.setThreadPriority(Process.THREAD_PRIORITY_URGENT_DISPLAY)

      // 2. Ghim thread vào Big cores (CPU Affinity qua JNI)
      val bigCores = detectBigCores()
      nativeSetAffinity(bigCores)

      // 3. Window flags + Sustained Performance trên UI thread
      UiThreadUtil.runOnUiThread {
        try {
          val activity = currentActivity
          if (activity != null) {
            val window = activity.window
            window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
              val pm = reactApplicationContext
                .getSystemService(Context.POWER_SERVICE) as PowerManager
              if (pm.isSustainedPerformanceModeSupported) {
                window.setSustainedPerformanceMode(true)
              }
            }
          }
          promise.resolve("Activated on ${bigCores.size} big core(s): ${bigCores.toList()}")
        } catch (e: Exception) {
          promise.reject("BOOST_UI_ERR", e.message ?: "Unknown error")
        }
      }
    } catch (e: Exception) {
      promise.reject("BOOST_ERR", e.message ?: "Unknown error")
    }
  }

  override fun deactivateMaxPower(promise: Promise) {
    try {
      // 1. Khôi phục thread priority về mức mặc định
      Process.setThreadPriority(Process.THREAD_PRIORITY_DEFAULT)

      // 2. Bỏ CPU affinity — cho phép scheduler tự điều phối lại
      nativeResetAffinity()

      // 3. Tắt window flags trên UI thread
      UiThreadUtil.runOnUiThread {
        try {
          val activity = currentActivity
          if (activity != null) {
            val window = activity.window
            window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
              window.setSustainedPerformanceMode(false)
            }
          }
          promise.resolve(true)
        } catch (e: Exception) {
          promise.reject("DEACTIVATE_UI_ERR", e.message ?: "Unknown error")
        }
      }
    } catch (e: Exception) {
      promise.reject("DEACTIVATE_ERR", e.message ?: "Unknown error")
    }
  }

  /**
   * Quét /sys/devices/system/cpu/cpuN/cpufreq/cpuinfo_max_freq
   * để tìm các core có xung nhịp tối đa cao nhất (Big cores).
   * Fallback về [0] nếu không đọc được (thiếu quyền hoặc không tồn tại).
   */
  private fun detectBigCores(): IntArray {
    val bigCores = mutableListOf<Int>()
    var maxFreq = 0L
    val coreCount = Runtime.getRuntime().availableProcessors()

    for (i in 0 until coreCount) {
      try {
        BufferedReader(FileReader("/sys/devices/system/cpu/cpu$i/cpufreq/cpuinfo_max_freq")).use { br ->
          val freq = br.readLine()?.trim()?.toLongOrNull() ?: return@use
          when {
            freq > maxFreq -> { maxFreq = freq; bigCores.clear(); bigCores.add(i) }
            freq == maxFreq -> bigCores.add(i)
          }
        }
      } catch (_: Exception) { /* quyền bị từ chối hoặc file không tồn tại */ }
    }

    return if (bigCores.isEmpty()) intArrayOf(0) else bigCores.toIntArray()
  }

  companion object {
    const val NAME = NativeHandelNativeEventSpec.NAME
    private const val TIMEOUT_MS = 5000L

    init {
      System.loadLibrary("performance-boost")
    }
  }
}
