@echo off
set ADB=C:\Users\cali\AppData\Local\Android\Sdk\platform-tools\adb.exe
set APK=C:\Users\cali\Downloads\HUDI-SOFT.COM-main\HUDI-SOFT-HMS-main\android\app\build\outputs\apk\debug\app-debug.apk

echo Checking connected devices...
"%ADB%" devices

echo.
echo Uninstalling old APK...
"%ADB%" uninstall online.hudisoft.hms

echo.
echo Installing new APK...
"%ADB%" install -r "%APK%"

if errorlevel 1 (
    echo.
    echo FAILED - Make sure:
    echo   1. Phone is connected via USB
    echo   2. USB Debugging is ON
    echo   3. You tapped Allow on the phone popup
) else (
    echo.
    echo SUCCESS! App installed on phone.
    echo Launching app...
    "%ADB%" shell am start -n online.hudisoft.hms/.MainActivity
)

pause
