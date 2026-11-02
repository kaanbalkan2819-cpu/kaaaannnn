@echo off
setlocal
cd /d "%~dp0\.."
where keytool >nul 2>nul || (echo HATA: keytool bulunamadi. JDK 21 kurun veya Android Studio'nun JBR\bin klasorunu PATH'e ekleyin. & pause & exit /b 1)
if exist keystore.properties (echo keystore.properties zaten var. Silmeden devam edilmez. & pause & exit /b 1)
echo === Yayin imza anahtari (upload key) olusturuluyor ===
echo Sorulan sifreyi UNUTMAYIN. Dosyayi ve sifreyi guvenli yere yedekleyin; kaybederseniz guncelleme yukleyemezsiniz.
set /p KP=Anahtar sifresi (en az 6 karakter): 
keytool -genkeypair -v -keystore worldconquest-upload.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000 -storepass %KP% -keypass %KP%
if errorlevel 1 (echo HATA: anahtar olusturulamadi. & pause & exit /b 1)
(echo storeFile=worldconquest-upload.jks& echo storePassword=%KP%& echo keyAlias=upload& echo keyPassword=%KP%) > keystore.properties
echo.
echo TAMAM: worldconquest-upload.jks + keystore.properties olusturuldu. Ikisini de YEDEKLEYIN, GitHub'a YUKLEMEYIN.
pause
