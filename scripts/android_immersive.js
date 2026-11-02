/* V122 — Alt sistem çubuğunu (geri / ana ekran / son uygulamalar) OYUN İÇİNDE gizler.
   Oyuncu ekranın en altından yukarı çekince çubuk geçici olarak görünür, sonra kendiliğinden tekrar gizlenir (immersive sticky).
   Android projesindeki MainActivity.java'yı yamar. Tekrar çalıştırmak güvenlidir (zaten yamalıysa dokunmaz).
   Kullanım: node scripts/android_immersive.js   (release_setup.js ve build_debug_apk.bat bunu kendisi çağırır) */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'capacitor.config.json'), 'utf8'));
const pkg = cfg.appId;
const f = path.join(ROOT, 'android', 'app', 'src', 'main', 'java', ...pkg.split('.'), 'MainActivity.java');
if (!fs.existsSync(f)) { console.log('[immersive] MainActivity.java yok (android projesi henüz oluşturulmadı): ' + f); process.exit(0); }
let s = fs.readFileSync(f, 'utf8');
if (/WC_IMMERSIVE/.test(s)) { console.log('[immersive] zaten yamalı'); process.exit(0); }
if (!/class\s+MainActivity\s+extends\s+BridgeActivity\s*\{\s*\}/.test(s)) {
  console.log('[immersive] UYARI: MainActivity özelleştirilmiş, otomatik yama atlandı. Elle ekleyin (bkz. scripts/android_immersive.js).'); process.exit(0);
}
s = `package ${pkg};

import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import com.getcapacitor.BridgeActivity;

// WC_IMMERSIVE: alt gezinme çubuğu gizli; ekranın altından yukarı çekince geçici görünür.
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        hideNav();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideNav();
    }

    private void hideNav() {
        try {
            if (Build.VERSION.SDK_INT >= 30) {
                WindowInsetsController c = getWindow().getInsetsController();
                if (c != null) {
                    c.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
                    c.hide(WindowInsets.Type.navigationBars());
                }
            } else {
                getWindow().getDecorView().setSystemUiVisibility(
                    View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
            }
        } catch (Exception e) { }
    }
}
`;
fs.writeFileSync(f, s);
console.log('[immersive] MainActivity.java yamalandı: alt çubuk gizli, yukarı çekince görünür');
