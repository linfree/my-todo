@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

echo ========================================
echo Android APK Builder (Fixed)
echo ========================================
echo.

REM 设置 Java 路径
set "JAVA_HOME=F:\Download\microsoft-jdk-21.0.9-windows-x64\jdk-21.0.9+10"
set "PATH=%JAVA_HOME%\bin;%PATH%"

REM 添加 Node.js 和 pnpm 到 PATH
for %%i in (C:\Users\linfr\AppData\Local\pnpm\pnpm.cmd) do set "PNPM_DIR=%%~dpi"
if defined PNPM_DIR (
    set "PATH=%PNPM_DIR%;%PATH%"
    echo [√] 找到 pnpm: %PNPM_DIR%
) else (
    echo [!] 警告: 未找到 pnpm
)

REM 切换到 Android 项目目录
cd /d "%~dp0"
echo 当前目录: %CD%
echo.

REM 停止所有 Gradle 守护进程
echo 止 Gradle 守护进程...
call gradlew.bat --stop 2>nul

REM 清理构建缓存
echo.
echo 清理构建缓存...
if exist build rmdir /s /q build
if exist .gradle rmdir /s /q .gradle
if exist app\build rmdir /s /q app\build
if exist app\.cxx rmdir /s /q app\.cxx
if exist app\.externalNativeBuild rmdir /s /q app\.externalNativeBuild

REM 清理 Kotlin 缓存
if exist %LOCALAPPDATA%\Google\gradle\caches\kotlin rmdir /s /q %LOCALAPPDATA%\Google\gradle\caches\kotlin

echo.
echo ========================================
echo 开始构建 APK...
echo ========================================
echo.

REM 设置环境变量禁用 Kotlin daemon
set "KOTLIN_DAEMON_ENABLED=false"
set "KOTLIN_INCREMENTAL=false"

REM 运行构建
call gradlew.bat assembleDebug --no-daemon --no-build-cache -Dkotlin.daemon=false -Dkotlin.incremental=false

set "BUILD_CODE=%ERRORLEVEL%"

echo.
echo ========================================
if "%BUILD_CODE%"=="0" (
    echo [√] 构建成功！
    echo.
    echo APK 文件:
    dir /s /b app\build\outputs\apk\debug\*.apk 2>nul
) else (
    echo [×] 构建失败，错误代码: %BUILD_CODE%
    echo.
    echo 请查看上面的错误信息
)
echo ========================================
echo.
pause
