@echo off
setlocal
cd /d "%~dp0"
echo === World Conquest Android kurulum (Capacitor 8 / API 36) ===
where node >nul 2>nul || (echo HATA: Node.js 22+ kurun: https://nodejs.org/ & pause & exit /b 1)
call node scripts\release_setup.js
if errorlevel 1 (pause & exit /b 1)
echo.
echo Hazir. Test APK: build_debug_apk.bat   ·   Play icin AAB: node scripts\release_setup.js --build
pause
