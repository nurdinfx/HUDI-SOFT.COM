@echo off
SET JAVA_HOME=C:\Program Files\Android\Android Studio\jbr
SET PATH=%JAVA_HOME%\bin;%PATH%
echo Java Home: %JAVA_HOME%
java -version
echo Building APK...
cd /d "%~dp0"
call gradlew.bat assembleDebug
echo Build exit code: %ERRORLEVEL%
