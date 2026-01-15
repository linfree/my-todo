@echo off
echo ========================================
echo Building Android APK...
echo ========================================
set JAVA_HOME=F:\Download\microsoft-jdk-21.0.9-windows-x64\jdk-21.0.9+10
set PATH=%JAVA_HOME%\bin;%PATH%
echo JAVA_HOME: %JAVA_HOME%
echo Working Directory: G:\dev\AI\my_todo\src-tauri\gen\android
echo.
cd /d G:\dev\AI\my_todo\src-tauri\gen\android
dir gradlew.bat
echo.
echo Running: gradlew.bat assembleDebug
echo.
call G:\dev\AI\my_todo\src-tauri\gen\android\gradlew.bat assembleDebug
echo.
echo ========================================
if %ERRORLEVEL% EQU 0 (
    echo BUILD SUCCESSFUL!
    echo APK location: app\build\outputs\apk\debug\app-debug.apk
    dir app\build\outputs\apk\debug\*.apk
) else (
    echo BUILD FAILED with error code %ERRORLEVEL%
)
echo ========================================
pause
