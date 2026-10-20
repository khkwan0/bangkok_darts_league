# expo-gl: textures / native GL classes referenced from JS
-keep class expo.modules.gl.** { *; }
-keepclassmembers class expo.modules.gl.** { *; }
-dontwarn expo.modules.gl.**

# expo-haptics + other Modules API 2.0 modules (R8 strips JNI trampolines otherwise)
# Mirrors expo-modules-core/android/proguard-rules.pro — kept at app level so
# consumer rules cannot be dropped by the release minify pipeline.
-keep class expo.modules.ExpoModulesV2ModuleList { public <init>(); }
-keep class * extends io.github.expo.modules.v2.Module {
  <init>();
  static ** INSTANCE;
}
-keep class io.github.expo.kolibri.** { *; }
-keep class io.github.expo.modules.v2.** { *; }
-keepclassmembers class * {
  @io.github.expo.modules.v2.JS *;
  @io.github.expo.modules.v2.Constant *;
  @io.github.expo.modules.v2.Event *;
  *** *$ExpoModulesV2(...);
  static ** *$ExpoModulesV2;
}
-keep class **$ExpoModulesV2 { <init>(); }
-keepclassmembers class * extends io.github.expo.modules.v2.Module { *; }
-keepclassmembers class * extends io.github.expo.modules.v2.SharedObject { *; }
-keep class expo.modules.haptics.** { *; }
