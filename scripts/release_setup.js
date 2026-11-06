#!/usr/bin/env node
/* World Conquest — Google Play yayın hazırlığı (Windows / macOS / Linux, yalnızca Node 22+ gerekir).
   Kullanım:
     node scripts/release_setup.js           -> Android projesini oluşturur/yeniler ve yayın ayarlarını uygular
     node scripts/release_setup.js --build   -> yukarıdakine ek olarak İMZALI .aab üretir (keystore.properties gerekir)
   Yaptıkları: cap add/sync, targetSdk 36 (Capacitor 8), versionCode/versionName (version.properties), yayın imzası
   (keystore.properties), yatay/dikey serbest ekran, uygulama simgesi + açılış ekranı (resources/android), kontrol listesi. */
'use strict';
const fs = require('fs'), path = require('path'), cp = require('child_process');
const ROOT = path.resolve(__dirname, '..'), isWin = process.platform === 'win32';
const A = (...p) => path.join(ROOT, 'android', ...p);
const log = (m) => console.log('• ' + m), die = (m) => { console.error('\nHATA: ' + m + '\n'); process.exit(1); };
function run(cmd, args, cwd) {
  const r = cp.spawnSync(cmd, args, { cwd: cwd || ROOT, stdio: 'inherit', shell: isWin });
  if (r.status !== 0) die(`"${cmd} ${args.join(' ')}" başarısız oldu.`);
}
function readProps(f) {
  const o = {}; if (!fs.existsSync(f)) return o;
  fs.readFileSync(f, 'utf8').split(/\r?\n/).forEach(l => { const m = l.match(/^\s*([A-Za-z0-9_.]+)\s*=\s*(.*?)\s*$/); if (m && l.trim()[0] !== '#') o[m[1]] = m[2]; });
  return o;
}
function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    e.isDirectory() ? copyDir(s, d) : fs.copyFileSync(s, d);
  }
}

// ---- 0) ön kontroller ----
if (parseInt(process.versions.node, 10) < 22) die('Node.js 22 veya üstü gerekli (Capacitor 8). https://nodejs.org/');
if (!fs.existsSync(path.join(ROOT, 'www', 'index.html'))) die('www/index.html bulunamadı.');
if (!fs.existsSync(path.join(ROOT, 'www', 'flags'))) die('www/flags yok. www/flags klasörü (www/flags/TR.svg gibi) eksik; dosyaları geri yükleyin.');
if (!fs.existsSync(path.join(ROOT, 'www', 'peerjs.min.js'))) die('www/peerjs.min.js yok.');
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'capacitor.config.json'), 'utf8'));
const ver = readProps(path.join(ROOT, 'version.properties'));
const versionCode = parseInt(ver.VERSION_CODE || '1', 10), versionName = ver.VERSION_NAME || '1.0.0';
if (!(versionCode >= 1)) die('version.properties içindeki VERSION_CODE geçersiz.');

// ---- 1) bağımlılıklar + Android projesi ----
if (!fs.existsSync(path.join(ROOT, 'node_modules', '@capacitor', 'android'))) { log('npm install ...'); run('npm', ['install']); }
if (!fs.existsSync(A('build.gradle'))) { log('Android projesi oluşturuluyor (cap add android) ...'); run('npx', ['cap', 'add', 'android']); }
log('Web dosyaları aktarılıyor (cap sync) ...'); run('npx', ['cap', 'sync', 'android']);

// ---- 2) app/build.gradle: sürüm + imza ----
const gf = A('app', 'build.gradle'); let g = fs.readFileSync(gf, 'utf8');
if (!/WC_RELEASE_PATCH/.test(g)) {
  g = g.replace(/versionCode\s+\d+/, 'versionCode ' + versionCode).replace(/versionName\s+"[^"]*"/, 'versionName "' + versionName + '"');
  g = g.replace('android {\n', `// WC_RELEASE_PATCH: yayın imzası keystore.properties dosyasından okunur (depoya EKLEME).
def wcKs = new Properties()
def wcKsFile = rootProject.file('../keystore.properties')
if (wcKsFile.exists()) { wcKsFile.withInputStream { wcKs.load(it) } }

android {
    signingConfigs {
        release {
            if (wcKsFile.exists()) {
                def kf = new File(wcKs['storeFile'])
                storeFile kf.isAbsolute() ? kf : rootProject.file('../' + wcKs['storeFile'])
                storePassword wcKs['storePassword']
                keyAlias wcKs['keyAlias']
                keyPassword wcKs['keyPassword']
            }
        }
    }
`);
  g = g.replace(/(release\s*\{\s*\n\s*minifyEnabled false)/, '$1\n            if (wcKsFile.exists()) { signingConfig signingConfigs.release }');
  fs.writeFileSync(gf, g); log('build.gradle: sürüm ' + versionName + ' (' + versionCode + ') + yayın imzası eklendi');
} else {
  g = g.replace(/versionCode\s+\d+/, 'versionCode ' + versionCode).replace(/versionName\s+"[^"]*"/, 'versionName "' + versionName + '"');
  fs.writeFileSync(gf, g); log('build.gradle: sürüm güncellendi: ' + versionName + ' (' + versionCode + ')');
}
if (!new RegExp('applicationId\\s+"' + cfg.appId.replace(/\./g, '\\.') + '"').test(g)) die('applicationId, capacitor.config.json appId ile uyuşmuyor.');

// ---- 3) AndroidManifest: ekran yönü (telefon otomatik döndür ayarına uyar) ----
const mf = A('app', 'src', 'main', 'AndroidManifest.xml'); let m = fs.readFileSync(mf, 'utf8');
if (!/screenOrientation/.test(m)) { m = m.replace('<activity', '<activity\n            android:screenOrientation="fullUser"'); fs.writeFileSync(mf, m); log('Manifest: ekran yönü = fullUser'); }

// ---- 3b) V158: alt gezinme çubuğu butonları örtmesin (Android 15/16 uçtan uca ekran) ----
run('node', [path.join(__dirname, 'fix_android_insets.js')]);
run('node', [path.join(__dirname, 'fix_android_splash.js')]);   // V217: açılışta beyaz parlama olmasın

// ---- 4) simge + açılış ekranı ----
const resSrc = path.join(ROOT, 'resources', 'android');
if (fs.existsSync(resSrc)) {
  copyDir(resSrc, A('app', 'src', 'main', 'res'));
  fs.writeFileSync(A('app', 'src', 'main', 'res', 'values', 'ic_launcher_background.xml'), '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#0A1B45</color>\n</resources>\n');
  log('Simgeler ve açılış ekranı uygulandı');
}

// ---- 5) yayın kontrol listesi ----
const warn = [];
if (!fs.existsSync(path.join(ROOT, 'keystore.properties'))) warn.push('keystore.properties yok -> .aab İMZASIZ olur, Play kabul etmez. scripts/anahtar_olustur.* çalıştırın.');
const legal = fs.readFileSync(path.join(ROOT, 'www', 'wc_legal_data.js'), 'utf8');
if (/\[GELİŞTİRİCİ ADI\]|\[E-POSTA ADRESİ\]|\[ÜLKE\/İL\]/.test(legal)) warn.push('Yasal metinlerde köşeli parantezli alanlar dolu değil -> node scripts/fill_placeholders.js "Ad Soyad" "mail@adres.com" "Türkiye"');
if (/apiKey:\s*""/.test(fs.readFileSync(path.join(ROOT, 'www', 'firebase_config.js'), 'utf8'))) warn.push('Firebase boş: Rank Maçı gerçek rakip aramaz, yapay zekâ rakip çıkar (bilinçli ise sorun değil).');
if (/G\.gold\s*=\s*99999/.test(fs.readFileSync(path.join(ROOT, 'www', 'v55.js'), 'utf8'))) warn.push('www/v55.js her oyuna 99.999 ücretsiz altın veriyor (test ayarı). Altın satışı yapacaksanız kaldırın.');
if (warn.length) { console.log('\n⚠ YAYIN ÖNCESİ UYARILAR:'); warn.forEach(w => console.log('  - ' + w)); console.log(''); }

// ---- 6) isteğe bağlı: imzalı AAB ----
if (process.argv.includes('--build')) {
  if (!fs.existsSync(path.join(ROOT, 'keystore.properties'))) die('--build için keystore.properties gerekli (scripts/anahtar_olustur.*).');
  log('İmzalı AAB derleniyor (gradlew bundleRelease) ...');
  run(isWin ? 'gradlew.bat' : './gradlew', ['bundleRelease'], A());
  const out = A('app', 'build', 'outputs', 'bundle', 'release', 'app-release.aab');
  if (!fs.existsSync(out)) die('Derleme bitti ama .aab bulunamadı.');
  const dst = path.join(ROOT, `WorldConquest-${versionName}-${versionCode}.aab`); fs.copyFileSync(out, dst);
  console.log('\nBAŞARILI: ' + dst + '\nBu dosyayı Play Console > Sürümler > Test (dahili) bölümüne yükleyin.');
} else console.log('Hazır. İmzalı AAB için: node scripts/release_setup.js --build   (veya Android Studio: Build > Generate Signed Bundle)');
