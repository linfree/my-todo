@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

echo ========================================
echo Android APK Builder
echo ========================================
echo.

REM 设置 Java 路径
set "JAVA_HOME=F:\Download\microsoft-jdk-21.0.9-windows-x64\jdk-21.0.9+10"
set "PATH=%JAVA_HOME%\bin;%PATH%"

REM 添加 pnpm 到 PATH
set "PATH=C:\Users\linfr\AppData\Local\pnpm;%PATH%"

REM 切换到 Android 项目目录
cd /d "%~dp0"

echo 当前目录: %CD%
echo.
echo 检查 gradlew.bat...
if exist gradlew.bat (
    echo [√] 找到 gradlew.bat
) else (
    echo [×] gradlew.bat 不存在！
    pause
    exit /b 1
)
echo.

echo ========================================
echo 开始构建 APK...
echo ========================================
echo.

call gradlew.bat assembleDebug --no-daemon --stacktrace

set "BUILD_CODE=%ERRORLEVEL%"

echo.
echo ========================================
if "%BUILD_CODE%"=="0" (
    echo [√] 构建成功！
    echo.
    echo APK 位置:
    dir /s /b app\build\outputs\apk\debug\*.apk 2>nul
) else (
    echo [×] 构建失败，错误代码: %BUILD_CODE%
)
echo ========================================
echo.
pause
