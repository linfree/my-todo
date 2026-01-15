@echo off
cd /d G:\dev\AI\my_todo\src-tauri\gen\android
set JAVA_HOME=F:\Download\microsoft-jdk-21.0.9-windows-x64\jdk-21.0.9+10
set PATH=%JAVA_HOME%\bin;%PATH%
call gradlew.bat assembleDebug
