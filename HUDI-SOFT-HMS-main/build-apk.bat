@echo off
echo ========================================
echo  HUDI-SOFT HMS - APK Builder (Clean)
echo ========================================

set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
set "PATH=%JAVA_HOME%\bin;%PATH%"

echo Java: %JAVA_HOME%
"%JAVA_HOME%\bin\java.exe" -version 2>&1
if errorlevel 1 ( echo ERROR: Java not found & pause & exit /b 1 )

echo.
echo [1/5] Clearing old cache...
if exist "%~dp0.next" rmdir /s /q "%~dp0.next"
if exist "%~dp0out" rmdir /s /q "%~dp0out"
if exist "%~dp0android\app\src\main\assets\public" rmdir /s /q "%~dp0android\app\src\main\assets\public"
echo Done.

echo.
echo [2/5] Building Next.js (fresh)...
cd /d "%~dp0"
call npm run build
if errorlevel 1 ( echo BUILD FAILED & pause & exit /b 1 )

echo.
echo [3/5] Syncing to Android...
call npx cap sync android
if errorlevel 1 ( echo SYNC FAILED & pause & exit /b 1 )

echo.
echo [4/5] Building APK with Gradle...
cd /d "%~dp0android"
call gradlew.bat assembleDebug
if errorlevel 1 ( echo GRADLE FAILED & pause & exit /b 1 )

echo.
echo ========================================
echo  BUILD SUCCESS!
echo ========================================
echo APK: %~dp0android\app\build\outputs\apk\debug\app-debug.apk
echo.

echo [5/5] Installing on connected device...
set "ADB=C:\Users\cali\AppData\Local\Android\Sdk\platform-tools\adb.exe"
if exist "%ADB%" (
    "%ADB%" devices
    "%ADB%" install -r "%~dp0android\app\build\outputs\apk\debug\app-debug.apk"
    if errorlevel 1 (
        echo Install failed - connect phone with USB Debugging ON
    ) else (
        echo APK installed on phone!
    )
)

pause
