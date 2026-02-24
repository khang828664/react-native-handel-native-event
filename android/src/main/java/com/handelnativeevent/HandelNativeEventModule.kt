package com.handelnativeevent

import com.facebook.react.bridge.ReactApplicationContext

class HandelNativeEventModule(reactContext: ReactApplicationContext) :
  NativeHandelNativeEventSpec(reactContext) {

  override fun multiply(a: Double, b: Double): Double {
    return a * b
  }

  companion object {
    const val NAME = NativeHandelNativeEventSpec.NAME
  }
}
