@echo off
set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
set "PATH=%JAVA_HOME%\bin;%PATH%"
set ADB=C:\Users\cali\AppData\Local\Android\Sdk\platform-tools\adb.exe

echo ==========================================
echo  HUDI-SOFT HMS - Full Build ^& Deploy
echo ==========================================

echo [1/4] Building Next.js frontend...
cd /d "%~dp0"
call npm run build
if %ERRORLEVEL% neq 0 (
    echo ERROR: npm build failed!
    pause
    exit /b 1
)

echo [2/4] Syncing to Android...
call npx cap sync android
if %ERRORLEVEL% neq 0 (
    echo ERROR: cap sync failed!
    pause
    exit /b 1
)

echo [3/4] Building APK...
cd /d "%~dp0android"
call gradlew.bat assembleDebug
if %ERRORLEVEL% neq 0 (
    echo ERROR: Gradle build failed!
    pause
    exit /b 1
)

echo [4/4] Installing APK on device...
cd /d "%~dp0"
echo Removing old version...
"%ADB%" uninstall online.hudisoft.hms 2>nul
echo Installing new version...
"%ADB%" install android\app\build\outputs\apk\debug\app-debug.apk
if %ERRORLEVEL% neq 0 (
    echo ERROR: Install failed! Is the device connected?
    pause
    exit /b 1
)

echo.
echo Launching app...
"%ADB%" shell am start -n online.hudisoft.hms/.MainActivity

echo.
echo ==========================================
echo  SUCCESS! App installed and launched.
echo  APK: %~dp0android\app\build\outputs\apk\debug\app-debug.apk
echo ==========================================
pause
