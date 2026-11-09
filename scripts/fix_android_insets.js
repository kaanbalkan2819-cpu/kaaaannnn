#!/usr/bin/env node
/* V158 — Samsung S25 FE vb. (Android 15/16, uçtan uca ekran): alttaki gezinme çubuğu / hareket çubuğu oyunun alt
   butonlarını (Saldır, Keşif...) örtüyordu. Bu betik android/.../MainActivity.java dosyasına, gezinme çubuğu kadar
   boşluğu uygulamanın altına/yanlarına ekleyen bir kod yazar. Tekrar çalıştırmak zararsızdır.
   Kullanım: node scripts/fix_android_insets.js   (build_debug_apk.bat ve release_setup.js bunu zaten çağırır)
   Geri almak için: MainActivity.java içinde "V158" yazan bloğu silin. */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const javaRoot = path.join(ROOT, 'android', 'app', 'src', 'main', 'java');
if (!fs.existsSync(javaRoot)) { console.log('• V158: android klasörü yok; önce setup_android_windows.bat çalıştırın.'); process.exit(0); }

function find(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { const r = find(p); if (r) return r; }
    else if (e.name === 'MainActivity.java') return p;
  }
  return null;
}
const f = find(javaRoot);
if (!f) { console.error('HATA: MainActivity.java bulunamadı.'); process.exit(1); }
let src = fs.readFileSync(f, 'utf8');
if (src.includes('V158')) { console.log('• V158: MainActivity zaten yamalı.'); process.exit(0); }
const pkg = (src.match(/^\s*package\s+([\w.]+)\s*;/m) || [])[1];
if (!pkg) { console.error('HATA: MainActivity.java paket adı okunamadı.'); process.exit(1); }

const out = `package ${pkg};

import android.os.Bundle;
import android.view.View;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    /* V158 — uçtan uca ekranda gezinme/hareket çubuğunun altında kalan alt butonları düzeltir.
       Gezinme çubuğu kadar boşluk uygulamanın alt/yan kenarına eklenir; durum çubuğu (üst) web tarafında kalır.
       Geri almak için bu onCreate bloğunu ve importları silin. */
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        try { getBridge().getWebView().getSettings().setTextZoom(100); } catch (Exception e) { }   // V226: Samsung vb. telefonlarda yazi olcegi duzeni bozmasin
        final View content = findViewById(android.R.id.content);
        content.setBackgroundColor(0xFF05060D);
        ViewCompat.setOnApplyWindowInsetsListener(content, (v, insets) -> {
            Insets nav = insets.getInsets(WindowInsetsCompat.Type.navigationBars());
            v.setPadding(nav.left, 0, nav.right, nav.bottom);
            return new WindowInsetsCompat.Builder(insets)
                .setInsets(WindowInsetsCompat.Type.navigationBars(), Insets.NONE)
                .build();
        });
        ViewCompat.requestApplyInsets(content);
    }
}
`;
fs.writeFileSync(f + '.bak158', src);
fs.writeFileSync(f, out);
console.log('• V158: MainActivity.java yamalandı (' + path.relative(ROOT, f) + '). Yedek: MainActivity.java.bak158');
