@echo off
setlocal
cd /d "%~dp0"
echo ==========================================
echo   World Conquest - Android APK derleme
echo ==========================================
where node >nul 2>nul || (echo HATA: Node.js LTS kurulu degil. https://nodejs.org/ & pause & exit /b 1)
where npm >nul 2>nul || (echo HATA: npm bulunamadi. Node.js kurulumunu kontrol edin. & pause & exit /b 1)
where java >nul 2>nul || (echo HATA: JDK 17 gerekli. Android Studio'nun JBR/JDK ayarini kontrol edin. & pause & exit /b 1)
if not exist package.json (echo HATA: package.json bulunamadi. & pause & exit /b 1)
if not exist android\gradlew.bat (
  echo Android projesi henuz olusturulmamis.
  echo Once setup_android_windows.bat dosyasini calistirin.
  pause
  exit /b 1
)
echo [1/3] Capacitor dosyalari senkronize ediliyor...
call npx cap sync android
if errorlevel 1 (echo HATA: Capacitor sync basarisiz. & pause & exit /b 1)
echo [2/3] Debug APK derleniyor...
pushd android
call gradlew.bat assembleDebug
if errorlevel 1 (
  popd
  echo HATA: Derleme basarisiz. Android SDK, JDK 17 ve SDK lisanslarini kontrol edin.
  pause
  exit /b 1
)
popd
echo [3/3] APK kontrol ediliyor...
if not exist android\app\build\outputs\apk\debug\app-debug.apk (
  echo HATA: Derleme bitti ancak APK dosyasi bulunamadi.
  pause
  exit /b 1
)
echo.
echo BASARILI! APK dosyasi:
echo %CD%\android\app\build\outputs\apk\debug\app-debug.apk
echo.
pause
