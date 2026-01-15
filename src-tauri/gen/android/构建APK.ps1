# 设置 JAVA_HOME
$env:JAVA_HOME = "F:\Download\microsoft-jdk-21.0.9-windows-x64\jdk-21.0.9+10"
$env:PATH = "F:\Download\microsoft-jdk-21.0.9-windows-x64\jdk-21.0.9+10\bin;" + $env:PATH

# 添加 pnpm 到 PATH
$env:PATH = "C:\Users\linfr\AppData\Roaming\npm;" + $env:PATH

# 切换到 Android 项目目录
Set-Location "G:\dev\AI\my_todo\src-tauri\gen\android"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Building Android APK..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "JAVA_HOME: $env:JAVA_HOME" -ForegroundColor Green
Write-Host "Current Directory: $PWD" -ForegroundColor Green
Write-Host "pnpm: $(Get-Command pnpm -ErrorAction SilentlyContinue).Source" -ForegroundColor Green
Write-Host ""

# 清理
Write-Host "Stopping Gradle daemon..." -ForegroundColor Yellow
& .\gradlew.bat --stop 2>$null

Write-Host "Cleaning build cache..." -ForegroundColor Yellow
Remove-Item -Recurse -Force build, .gradle, app\build, app\.cxx, app\.externalNativeBuild, buildSrc\build -ErrorAction SilentlyContinue

# 清理 Kotlin 缓存
$kotlinCache = "$env:LOCALAPPDATA\Google\gradle\caches\kotlin"
if (Test-Path $kotlinCache) {
    Remove-Item -Recurse -Force $kotlinCache -ErrorAction SilentlyContinue
}

Write-Host "Cleaning Gradle caches..." -ForegroundColor Yellow
$gradleCaches = "$env:USERPROFILE\.gradle\caches"
if (Test-Path $gradleCaches) {
    Remove-Item -Recurse -Force "$gradleCaches\*" -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Running Gradle build..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 运行构建（不使用 kotlin.daemon 参数，跳过 Rust 构建）
$buildResult = & .\gradlew.bat assembleDebug --no-daemon --no-build-cache -x :app:rustBuildArm64Debug 2>&1

# 显示构建输出
$buildResult | ForEach-Object { Write-Host $_ }

Write-Host ""
if ($LASTEXITCODE -eq 0) {
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "BUILD SUCCESSFUL!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "APK files:" -ForegroundColor Cyan
    Get-ChildItem -Recurse -Path "app\build\outputs\apk\debug" -Filter "*.apk" -ErrorAction SilentlyContinue | ForEach-Object {
        Write-Host "  - $($_.FullName)" -ForegroundColor Green
    }
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "BUILD FAILED!" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
}

Write-Host ""
