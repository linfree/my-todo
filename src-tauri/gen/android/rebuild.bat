@echo off
echo ========================================
echo Cleaning and Rebuilding Android APK...
echo ========================================
set JAVA_HOME=F:\Download\microsoft-jdk-21.0.9-windows-x64\jdk-21.0.9+10
set PATH=%JAVA_HOME%\bin;C:\Users\linfr\AppData\Local\pnpm;G:\dev\AI\my_todo\node_modules\.bin;%PATH%
echo.
echo Step 1: Cleaning build cache...
cd /d G:\dev\AI\my_todo\src-tauri\gen\android
call gradlew.bat clean
echo.
echo Step 2: Building APK...
call gradlew.bat assembleDebug --no-daemon --no-build-cache --rerun-tasks
echo.
echo ========================================
if %ERRORLEVEL% EQU 0 (
    echo BUILD SUCCESSFUL!
    echo.
    echo Finding APK...
    dir /s /b app\build\outputs\apk\*.apk
) else (
    echo BUILD FAILED with error code %ERRORLEVEL%
)
echo ========================================
pause
