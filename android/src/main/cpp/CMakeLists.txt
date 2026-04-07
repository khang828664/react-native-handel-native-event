cmake_minimum_required(VERSION 3.22.1)

project(performance-boost)

add_library(
  performance-boost
  SHARED
  performance-boost.cpp
)

# Compiler: O3 + dead-code elimination + no RTTI/exceptions (smaller .so)
target_compile_options(performance-boost PRIVATE
  -O3
  -fno-rtti
  -fno-exceptions
)

# Link against Android log (optional: useful for __android_log_print debug)
find_library(log-lib log)
target_link_libraries(performance-boost ${log-lib})
