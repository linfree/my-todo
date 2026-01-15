$env:JAVA_HOME = "F:\Download\microsoft-jdk-21.0.9-windows-x64\jdk-21.0.9+10"
$env:PATH = "F:\Download\microsoft-jdk-21.0.9-windows-x64\jdk-21.0.9+10\bin;" + $env:PATH
Set-Location "G:\dev\AI\my_todo\src-tauri\gen\android"
.\gradlew.bat --stop
Start-Sleep -Seconds 2
.\gradlew.bat assembleDebug --no-daemon
