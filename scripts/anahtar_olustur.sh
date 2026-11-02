#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."
command -v keytool >/dev/null || { echo "HATA: keytool yok (JDK 21 kurun)"; exit 1; }
[ -f keystore.properties ] && { echo "keystore.properties zaten var."; exit 1; }
read -r -s -p "Anahtar sifresi (en az 6 karakter): " KP; echo
keytool -genkeypair -v -keystore worldconquest-upload.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000 -storepass "$KP" -keypass "$KP"
printf 'storeFile=worldconquest-upload.jks\nstorePassword=%s\nkeyAlias=upload\nkeyPassword=%s\n' "$KP" "$KP" > keystore.properties
chmod 600 keystore.properties worldconquest-upload.jks
echo "TAMAM. worldconquest-upload.jks ve keystore.properties dosyalarini YEDEKLEYIN, depoya YUKLEMEYIN."
