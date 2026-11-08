/* Android projesini olusturur ve AdMob ayarlarini ekler:
   - npx cap add android / sync
   - AndroidManifest.xml: AdMob APPLICATION_ID meta-data + dikey ekran
   - strings.xml: admob_app_id  (YAYINDAN ONCE kendi AdMob UYGULAMA kimliginle degistir: ADMOB_APP_ID)
   - uygulama simgesi (resources/icon.png) */
const fs = require('fs'), path = require('path'), cp = require('child_process');
const ADMOB_APP_ID = process.env.ADMOB_APP_ID || 'ca-app-pub-3940256099942544~3347511713'; // Google TEST uygulama kimligi
const run = c => cp.execSync(c, { stdio: 'inherit' });
if (!fs.existsSync('android')) run('npx cap add android');
run('npx cap sync android');
const man = 'android/app/src/main/AndroidManifest.xml';
let m = fs.readFileSync(man, 'utf8');
if (!m.includes('com.google.android.gms.ads.APPLICATION_ID'))
  m = m.replace(/<application([^>]*)>/, '<application$1>\n        <meta-data android:name="com.google.android.gms.ads.APPLICATION_ID" android:value="@string/admob_app_id" />');
if (!m.includes('screenOrientation')) m = m.replace(/<activity/, '<activity android:screenOrientation="portrait"');
fs.writeFileSync(man, m);
const sx = 'android/app/src/main/res/values/strings.xml';
let s = fs.readFileSync(sx, 'utf8');
if (!s.includes('admob_app_id')) s = s.replace('</resources>', '    <string name="admob_app_id">' + ADMOB_APP_ID + '</string>\n</resources>');
fs.writeFileSync(sx, s);
const res = 'android/app/src/main/res';
for (const d of fs.readdirSync(res)) {
  if (d.startsWith('mipmap-anydpi')) { fs.rmSync(path.join(res, d), { recursive: true, force: true }); continue; }
  if (d.startsWith('mipmap-')) for (const f of ['ic_launcher.png', 'ic_launcher_round.png', 'ic_launcher_foreground.png']) {
    const p = path.join(res, d, f); if (fs.existsSync(p)) fs.copyFileSync('resources/icon.png', p);
  }
}
console.log('Android hazir. AdMob uygulama kimligi:', ADMOB_APP_ID);
