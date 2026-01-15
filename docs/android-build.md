# Tauri Android 打包流程（Windows）

本文档整理了本项目（Tauri 2 + React/Vite）的 Android APK 打包流程、前置条件、常见问题与变通方案。适用于 Windows 系统环境。

## 项目概览
- 技术栈：Tauri 2（Rust + 前端 React/Vite）
- Android 构建：已生成完整 Gradle 项目
  - 项目根目录：[android 目录](file:///g:/dev/AI/my_todo/src-tauri/gen/android)
  - App 模块配置：[build.gradle.kts](file:///g:/dev/AI/my_todo/src-tauri/gen/android/app/build.gradle.kts)
  - Tauri 配置：[tauri.conf.json](file:///g:/dev/AI/my_todo/src-tauri/tauri.conf.json#L6-L11)
  - SDK 本地路径：[local.properties](file:///g:/dev/AI/my_todo/src-tauri/gen/android/local.properties#L8)

## 前置条件
- JDK：Microsoft OpenJDK 21（或兼容 JDK）
- Android SDK 与 NDK：建议 NDK r26+，在用户目录安装即可
- Rust 工具链：rustup + stable，包含 aarch64-linux-android 交叉编译目标（由 Tauri/Gradle集成）
- Node.js 18+ 与 pnpm
- Windows 开发者模式（推荐；用于允许创建符号链接）

## 环境变量设置（示例）
在 PowerShell 终端设置（本仓库使用的示例值）：
```powershell
$env:JAVA_HOME='F:\Download\microsoft-jdk-21.0.9-windows-x64\jdk-21.0.9+10'
$env:PATH='C:\Users\linfr\.cargo\bin;' + $env:PATH
```

说明：
- ANDROID_HOME/ANDROID_SDK_ROOT 可不显式设置，Gradle 会从 [local.properties](file:///g:/dev/AI/my_todo/src-tauri/gen/android/local.properties#L8) 读取 sdk.dir。
- 如需持久设置，请在系统“环境变量”中配置。

## 构建前端产物
Tauri 配置已指定前端输出目录为 `../dist`：
- 参考：[tauri.conf.json](file:///g:/dev/AI/my_todo/src-tauri/tauri.conf.json#L6-L11)

在项目根目录执行：
```powershell
pnpm install
pnpm build
```

成功后会生成 `dist/` 静态资源。

## 标准打包（推荐）
前提：Windows 已启用“开发者模式”，允许创建符号链接。

- 方式一（Tauri 一站式）：
```powershell
pnpm tauri android build
```
产物位置（Release）：
- `g:\dev\AI\my_todo\src-tauri\gen\android\app\build\outputs\apk\release\app-release.apk`（常规）
- 或各 ABI 变体输出目录（arm/arm64/x86/x86_64/universal）

- 方式二（直接使用 Gradle）：
```powershell
cd g:\dev\AI\my_todo\src-tauri\gen\android
.\gradlew.bat assembleDebug
.\gradlew.bat assembleRelease
```

常见输出路径示例：
- Debug：`app\build\outputs\apk\debug\app-debug.apk`
- Release：`app\build\outputs\apk\release\app-release.apk`
- ABI 变体：
  - `app\build\outputs\apk\arm64\release\app-arm64-release-unsigned.apk`
  - `app\build\outputs\apk\universal\release\app-universal-release-unsigned.apk`

## Windows 符号链接限制与解决
Tauri 在将 Rust 产出的 `.so` 文件放入 `jniLibs` 时默认使用符号链接。在 Windows 未启用开发者模式时会报错：
```
Creation symbolic link is not allowed for this system.
```

解决方案：
- 启用开发者模式（Windows 10+）：
  - 设置 → 隐私和安全性 → 开发者选项 → 开启“开发者模式”
- 如果被企业策略限制，可申请管理员权限并在本地安全策略中为当前用户授予“创建符号链接”权限。

参考 Tauri 官方说明与社区讨论（略）。

## 无开发者模式的变通打包方案
如果暂时无法启用开发者模式，可采用“复制 .so + 跳过 Rust 构建任务”的方式完成 Gradle 打包：

1) 先用 Tauri/Rust 编译生成目标架构的 `.so`（例如 arm64）  
   当执行 `pnpm tauri android build` 时，Rust 产物会出现在：
   ```
   g:\dev\AI\my_todo\src-tauri\target\aarch64-linux-android\release\libtauri_app_lib.so
   ```

2) 手动将 `.so` 复制到 `jniLibs`：
```powershell
$src = "G:\dev\AI\my_todo\src-tauri\target\aarch64-linux-android\release\libtauri_app_lib.so"
$dstDir = "G:\dev\AI\my_todo\src-tauri\gen\android\app\src\main\jniLibs\arm64-v8a"
if (!(Test-Path $dstDir)) { New-Item -ItemType Directory -Force -Path $dstDir | Out-Null }
Copy-Item -Force $src (Join-Path $dstDir "libtauri_app_lib.so")
```

3) 使用 Gradle 跳过 Rust 构建任务，直接打包：
```powershell
cd "G:\dev\AI\my_todo\src-tauri\gen\android"
.\gradlew.bat assembleRelease -x app:rustBuildArm64Release -x app:rustBuildArmRelease -x app:rustBuildX86Release -x app:rustBuildX86_64Release
```

完成后，APK 产物会在各 ABI 的 `release` 目录下，例如：
- `app\build\outputs\apk\arm64\release\app-arm64-release-unsigned.apk`
- `app\build\outputs\apk\universal\release\app-universal-release-unsigned.apk`

说明：
- 该方案避免了 Windows 对符号链接的限制，但需要保证 `.so` 文件已正确生成并放置到相应 `jniLibs` 目录，否则某些 ABI 包会提示“没有可打包的 .so 文件”。

## 调试构建与现有脚本
仓库已提供可用脚本：
- PowerShell 脚本：[build_apk.ps1](file:///g:/dev/AI/my_todo/src-tauri/gen/android/build_apk.ps1)
  ```powershell
  $env:JAVA_HOME = "F:\Download\microsoft-jdk-21.0.9-windows-x64\jdk-21.0.9+10"
  $env:PATH = "$env:JAVA_HOME\bin;" + $env:PATH
  Set-Location "G:\dev\AI\my_todo\src-tauri\gen\android"
  .\gradlew.bat --stop
  Start-Sleep -Seconds 2
  .\gradlew.bat assembleDebug --no-daemon
  ```
- 批处理脚本：[assemble_debug.bat](file:///g:/dev/AI/my_todo/src-tauri/gen/android/assemble_debug.bat)

执行后输出：
- Debug APK：`app\build\outputs\apk\debug\app-debug.apk`

## APK 签名与安装
当前 Release 包为未签名 APK（`*-unsigned.apk`），可用于测试安装。若用于分发/上架，需签名：

- 使用 Android SDK `apksigner`（位于 `build-tools/<version>/apksigner.bat`）：
```powershell
$buildTools = "C:\Users\linfr\AppData\Local\Android\Sdk\build-tools\35.0.0"
$unsigned = "G:\dev\AI\my_todo\src-tauri\gen\android\app\build\outputs\apk\arm64\release\app-arm64-release-unsigned.apk"
$signed = "G:\dev\AI\my_todo\src-tauri\gen\android\app\build\outputs\apk\arm64\release\app-arm64-release-signed.apk"

# 示例：使用 keystore 签名（需先准备 keystore 与别名/口令）
& "$buildTools\apksigner.bat" sign `
  --ks "D:\keys\my-release-key.jks" `
  --ks-key-alias "myalias" `
  --out $signed `
  $unsigned
```

- 安装到设备（需开启 USB 调试并安装 adb）：
```powershell
adb install -r "G:\dev\AI\my_todo\src-tauri\gen\android\app\build\outputs\apk\arm64\release\app-arm64-release-unsigned.apk"
```
如为已签名的 APK，替换上方路径为 `*-signed.apk`。

## 自动签名配置（Gradle）
可在构建时自动签名 Release 包，避免手动 apksigner 步骤：

1) 生成自己的 release keystore：
```powershell
keytool -genkeypair -keystore D:\keys\my-release-key.jks -storepass <你的密码> -keypass <你的密码> -alias mytodo -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=linfr, OU=Dev, O=MyTodo, L=Shanghai, S=Shanghai, C=CN"
```

2) 在 `src-tauri/gen/android/` 目录下创建 `keystore.properties`（请勿提交到版本库），内容示例：
```
storeFile=E:\\path\\to\\your\\release.keystore
storePassword=YOUR_STORE_PASSWORD
keyAlias=YOUR_KEY_ALIAS
keyPassword=YOUR_KEY_PASSWORD
```
注：仓库中已提供示例文件 `keystore.properties.example`。

3) 直接构建 Release（如已启用开发者模式或使用变通方案）：
```powershell
cd g:\dev\AI\my_todo\src-tauri\gen\android
.\gradlew.bat assembleRelease
```
若 `keystore.properties` 存在，Gradle 会自动为 Release 使用签名配置，输出已签名的 APK。

## 常见问题
- 符号链接报错  
  启用 Windows 开发者模式或授予“创建符号链接”权限；或采用“复制 .so + 跳过任务”的变通方案。
- Rust 构建阶段 panic（如缺少 `server-addr` 临时文件）  
  可设置 `RUST_BACKTRACE=1` 获取详细堆栈，优先尝试用 Tauri CLI 一站式构建（`pnpm tauri android build`），再回退到 Gradle 变通方案。
- JDK 21“source/target 8 过时”告警  
  仅为编译告警，可在 `gradle.properties` 中加 `android.javaCompile.suppressSourceTargetDeprecationWarning=true` 抑制，或按需调整 Java toolchain。
- “无 .so 可打包”  
  说明对应 ABI 的 `jniLibs` 目录没有 `.so`，为目标设备架构准备并复制对应 `.so` 后重试。

## 参考路径/文件
- Android 项目根：[src-tauri/gen/android](file:///g:/dev/AI/my_todo/src-tauri/gen/android)
- Gradle Wrapper：[gradlew.bat](file:///g:/dev/AI/my_todo/src-tauri/gen/android/gradlew.bat)
- 应用模块配置：[app/build.gradle.kts](file:///g:/dev/AI/my_todo/src-tauri/gen/android/app/build.gradle.kts)
- Tauri 配置：[tauri.conf.json](file:///g:/dev/AI/my_todo/src-tauri/tauri.conf.json)
- SDK 本地路径：[local.properties](file:///g:/dev/AI/my_todo/src-tauri/gen/android/local.properties)

---
维护建议：如团队在 Windows 上经常打包 Android，强烈建议启用开发者模式以避免符号链接相关问题，并在 CI/构建机上统一环境配置与签名证书管理。 

