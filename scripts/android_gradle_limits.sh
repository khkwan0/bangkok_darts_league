# shellcheck shell=bash
# Sourced by archive_android.sh / deploy_android.sh.
#
# Env overrides:
#   MAX_CPUS          Gradle worker count (default 1 on <=8GB, else 2)
#   NINJA_JOBS        Native compile jobs per ninja process (default 1 on <=8GB, else 2)
#   MAX_HEAP_MB       Gradle daemon heap (default 4096 release / 2048 debug on <=8GB)
#   MAX_METASPACE_MB  Gradle MaxMetaspaceSize (default 512 on <=8GB, else 768)
#   KOTLIN_HEAP_MB    Kept for a fallback Kotlin daemon (default 512). Release/debug
#                     builds use the in-process compiler so this JVM is not started.
#   NODE_HEAP_MB      Metro / Node heap (default 1024 on <=8GB, else 1536)
#
# begin_android_build_limits runs before prebuild (Node heap only).
# apply_android_gradle_limits runs after prebuild, once android/ exists.

android_build_memory_defaults() {
  local profile="${1:-release}"
  local mem_mb
  mem_mb=$(( $(sysctl -n hw.memsize) / 1024 / 1024 ))

  local default_cpus=2
  local default_ninja=2
  local default_node=1536
  local default_heap=4096
  local default_meta=768
  local default_kotlin=768
  local default_r8_threads=2

  # An 8GB Mac cannot hold an 8-way native compile plus a multi-gigabyte Gradle heap.
  if [ "$mem_mb" -le 9216 ]; then
    default_cpus=1
    default_ninja=1
    default_node=1024
    default_meta=512
    default_kotlin=512
    default_r8_threads=1
    if [ "$profile" = "debug" ]; then
      default_heap=2048
    fi
  fi

  MAX_CPUS="${MAX_CPUS:-$default_cpus}"
  NINJA_JOBS="${NINJA_JOBS:-$default_ninja}"
  MAX_HEAP_MB="${MAX_HEAP_MB:-$default_heap}"
  MAX_METASPACE_MB="${MAX_METASPACE_MB:-$default_meta}"
  KOTLIN_HEAP_MB="${KOTLIN_HEAP_MB:-$default_kotlin}"
  NODE_HEAP_MB="${NODE_HEAP_MB:-$default_node}"
  R8_THREADS="${R8_THREADS:-$default_r8_threads}"
  ANDROID_MEM_MB="$mem_mb"
  ANDROID_BUILD_PROFILE="$profile"

  export NINJA_JOBS
  export CMAKE_BUILD_PARALLEL_LEVEL="$NINJA_JOBS"
  # Replace any previous cap from an earlier call in this shell.
  local node_opts
  node_opts="$(printf '%s' "${NODE_OPTIONS:-}" | sed -E 's/--max-old-space-size=[0-9]+//g' | xargs)"
  if [ -n "$node_opts" ]; then
    export NODE_OPTIONS="${node_opts} --max-old-space-size=${NODE_HEAP_MB}"
  else
    export NODE_OPTIONS="--max-old-space-size=${NODE_HEAP_MB}"
  fi
}

begin_android_build_limits() {
  android_build_memory_defaults "${1:-release}"
  echo "Android memory (${ANDROID_MEM_MB}MB, ${ANDROID_BUILD_PROFILE}): workers=${MAX_CPUS}, ninja=${NINJA_JOBS}, heap=${MAX_HEAP_MB}m, node=${NODE_HEAP_MB}m"
}

apply_android_gradle_limits() {
  if [ -z "${ANDROID_MEM_MB:-}" ]; then
    android_build_memory_defaults "${1:-release}"
  fi

  local props="android/gradle.properties"
  if [ ! -f "$props" ]; then
    echo "error: missing ${props} (run prebuild first)" >&2
    return 1
  fi

  chmod +x "$(dirname "$0")/limit-ninja.sh" 2>/dev/null || chmod +x scripts/limit-ninja.sh

  printf '%s\n' "$NINJA_JOBS" > android/.bpl-ninja-jobs

  # Rewrite limits idempotently. Also repairs older runs that appended without a
  # leading newline and glued "# BPL_GRADLE_LIMITS" onto the previous property.
  MAX_CPUS="$MAX_CPUS" MAX_HEAP_MB="$MAX_HEAP_MB" MAX_METASPACE_MB="$MAX_METASPACE_MB" \
  KOTLIN_HEAP_MB="$KOTLIN_HEAP_MB" R8_THREADS="$R8_THREADS" PROPS_PATH="$props" node <<'EOF'
const fs = require('fs')
const path = process.env.PROPS_PATH
let text = fs.readFileSync(path, 'utf8')

text = text.replace(
  /\n?# BPL_GRADLE_LIMITS\n[\s\S]*?# BPL_GRADLE_LIMITS_END\n?/g,
  '\n',
)
text = text.replace(/\n?# BPL_GRADLE_LIMITS_END\n?/g, '\n')
text = text.replace(/([^\n])# BPL_GRADLE_LIMITS\b/g, '$1\n')
text = text.replace(/\n?# BPL_GRADLE_LIMITS\b\n?/g, '\n')
// Drop Expo's earlier copies so the block below is the only definition.
// Gradle does not promise which duplicate property wins.
for (const key of [
  'org.gradle.jvmargs',
  'org.gradle.parallel',
  'org.gradle.workers.max',
  'kotlin.daemon.jvmargs',
  'kotlin.compiler.execution.strategy',
  'android.r8.maxWorkers',
  'android.r8.threadPoolSize',
  'android.aapt2ThreadPoolSize',
]) {
  text = text.replace(new RegExp('^' + key.replace(/\./g, '\\.') + '=.*\\n', 'gm'), '')
}
text = text.replace(/\s+$/g, '\n')

const block = `
# BPL_GRADLE_LIMITS
org.gradle.jvmargs=-Xmx${process.env.MAX_HEAP_MB}m -XX:MaxMetaspaceSize=${process.env.MAX_METASPACE_MB}m -XX:ReservedCodeCacheSize=128m -Xss512k -Dfile.encoding=UTF-8
org.gradle.workers.max=${process.env.MAX_CPUS}
org.gradle.parallel=false
kotlin.compiler.execution.strategy=in-process
kotlin.daemon.jvmargs=-Xmx${process.env.KOTLIN_HEAP_MB}m -XX:MaxMetaspaceSize=256m
android.r8.maxWorkers=1
android.r8.threadPoolSize=${process.env.R8_THREADS}
android.aapt2ThreadPoolSize=1
# BPL_GRADLE_LIMITS_END
`
fs.writeFileSync(path, text + '\n' + block)
EOF

  cat > android/bpl-memory.gradle <<'EOF'
// Points CMake/Ninja at scripts/limit-ninja.sh so native compiles cannot
// fan out across every CPU. AGP stores this path when it configures CMake.
def ninjaScript = new File(rootDir, "../scripts/limit-ninja.sh").absolutePath

def capNinja = { ext ->
    def args = ext.defaultConfig.externalNativeBuild.cmake.arguments
    def already = false
    args.each { value ->
        if (value.toString().startsWith("-DCMAKE_MAKE_PROGRAM=")) {
            already = true
        }
    }
    if (!already) {
        args.add("-DCMAKE_MAKE_PROGRAM=" + ninjaScript)
    }
}

// settings.gradle evaluates before any project, so beforeProject registers
// finalizeDsl before the Android plugin locks its DSL.
gradle.beforeProject { project ->
    ["com.android.application", "com.android.library"].each { pluginId ->
        project.pluginManager.withPlugin(pluginId) {
            def components = project.extensions.findByName("androidComponents")
            if (components != null) {
                components.finalizeDsl { ext -> capNinja(ext) }
            }
        }
    }
}
EOF

  # Older runs appended this to build.gradle, which is too late for finalizeDsl.
  if [ -f android/build.gradle ] && grep -q 'bpl-memory.gradle' android/build.gradle; then
    sed -i '' '/apply from: "bpl-memory.gradle"/d' android/build.gradle
  fi
  if ! grep -q 'bpl-memory.gradle' android/settings.gradle; then
    printf '\napply from: "bpl-memory.gradle"\n' >> android/settings.gradle
  fi

  if [ -x android/gradlew ]; then
    (cd android && ./gradlew --stop >/dev/null 2>&1) || true
  fi

  echo "Gradle limits: workers=${MAX_CPUS}, ninja=${NINJA_JOBS}, heap=${MAX_HEAP_MB}m, metaspace=${MAX_METASPACE_MB}m, kotlin=in-process, node=${NODE_HEAP_MB}m"
}
