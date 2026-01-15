@echo off
echo ========================================
echo Building Android APK...
echo ========================================
cd /d G:\dev\AI\my_todo\src-tauri\gen\android
set JAVA_HOME=F:\Download\microsoft-jdk-21.0.9-windows-x64\jdk-21.0.9+10
set PATH=%JAVA_HOME%\bin;%PATH%
echo Running: gradlew.bat assembleDebug
echo.
call gradlew.bat assembleDebug
echo.
echo ========================================
if %ERRORLEVEL% EQU 0 (
    echo BUILD SUCCESSFUL!
    echo APK location: app\build\outputs\apk\debug\app-debug.apk
) else (
    echo BUILD FAILED with error code %ERRORLEVEL%
)
echo ========================================
pause
