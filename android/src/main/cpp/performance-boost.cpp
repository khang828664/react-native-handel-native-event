#include <jni.h>
#include <sched.h>
#include <unistd.h>

extern "C"
JNIEXPORT jboolean JNICALL
Java_com_handelnativeevent_HandelNativeEventModule_nativeSetAffinity(
    JNIEnv *env, jobject /* thiz */, jintArray core_ids) {

  jint *cores = env->GetIntArrayElements(core_ids, nullptr);
  jsize size  = env->GetArrayLength(core_ids);

  cpu_set_t cpuset;
  CPU_ZERO(&cpuset);
  for (int i = 0; i < size; i++) {
    CPU_SET(cores[i], &cpuset);
  }

  // Pin the calling thread to the specified cores (pid 0 = current thread)
  int result = sched_setaffinity(0, sizeof(cpu_set_t), &cpuset);

  env->ReleaseIntArrayElements(core_ids, cores, 0);
  return static_cast<jboolean>(result == 0);
}

extern "C"
JNIEXPORT jboolean JNICALL
Java_com_handelnativeevent_HandelNativeEventModule_nativeResetAffinity(
    JNIEnv * /* env */, jobject /* thiz */) {

  // Reset: allow all available cores
  int coreCount = (int)sysconf(_SC_NPROCESSORS_ONLN);
  cpu_set_t cpuset;
  CPU_ZERO(&cpuset);
  for (int i = 0; i < coreCount; i++) {
    CPU_SET(i, &cpuset);
  }

  int result = sched_setaffinity(0, sizeof(cpu_set_t), &cpuset);
  return static_cast<jboolean>(result == 0);
}
