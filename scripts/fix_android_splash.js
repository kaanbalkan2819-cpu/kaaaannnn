#!/usr/bin/env node
/* V217 — Açılışta parlak (beyaz) ekran yanıp sönmesi düzeltmesi.
   Capacitor'ün Android şablonunda pencere arka planı açık renkli temadan (DayNight / Theme.SplashScreen) gelir:
   sistem açılış ekranı ve WebView'in ilk karesi çizilene kadar bir an BEYAZ görünür, sonra koyu ana menü gelir = "ışık açılıp kapanması".
   Bu betik android/app/src/main/res/values-xxx/styles.xml içindeki tüm AppTheme stillerine koyu arka plan (#05060D, menüyle aynı) yazar,
   açılış (splash) temasına da aynı rengi verir. Tekrar çalıştırmak zararsızdır.
   Kullanım: node scripts/fix_android_splash.js   (build_debug_apk.bat ve release_setup.js bunu zaten çağırır)
   Geri almak için: styles.xml içindeki "V217" yorumlu satırları ve values/wc_colors.xml dosyasını silin. */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const RES = path.join(ROOT, 'android', 'app', 'src', 'main', 'res');
if (!fs.existsSync(RES)) { console.log('• V217: android klasörü yok; önce setup_android_windows.bat çalıştırın.'); process.exit(0); }

fs.writeFileSync(path.join(RES, 'values', 'wc_colors.xml'),
  '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="wc_bg">#05060D</color>\n</resources>\n');

let n = 0;
for (const d of fs.readdirSync(RES)) {
  if (!/^values/.test(d)) continue;
  const f = path.join(RES, d, 'styles.xml'); if (!fs.existsSync(f)) continue;
  let s = fs.readFileSync(f, 'utf8'); const before = s;
  s = s.replace(/<style\s+name="(AppTheme[^"]*)"([^>]*)>([\s\S]*?)<\/style>/g, (all, name, attrs, body) => {
    if (/V217/.test(body)) return all;
    const add = [];
    add.push('        <!-- V217: koyu pencere arka planı (açılışta beyaz parlama olmasın) -->');
    if (!/android:windowBackground/.test(body)) add.push('        <item name="android:windowBackground">@color/wc_bg</item>');
    if (!/android:colorBackground/.test(body)) add.push('        <item name="android:colorBackground">@color/wc_bg</item>');
    if (/parent="Theme.SplashScreen/.test(attrs)) {
      if (!/windowSplashScreenBackground/.test(body)) add.push('        <item name="windowSplashScreenBackground">@color/wc_bg</item>');
      if (!/windowSplashScreenAnimatedIcon/.test(body)) add.push('        <item name="windowSplashScreenAnimatedIcon">@drawable/bkb_icon</item>');   /* V230: açılışta BKB logosu */
    }
    return '<style name="' + name + '"' + attrs + '>' + body.replace(/\s*$/, '\n') + add.join('\n') + '\n    </style>';
  });
  if (s !== before) { fs.writeFileSync(path.join(ROOT, 'android', d + '-styles.xml.bak217'), before); fs.writeFileSync(f, s); n++; console.log('• V217: ' + path.relative(ROOT, f) + ' yamalandı (yedek: android/' + d + '-styles.xml.bak217)'); }
}
if (!n) console.log('• V217: styles.xml zaten yamalı (veya bulunamadı).');
