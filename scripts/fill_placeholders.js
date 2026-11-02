#!/usr/bin/env node
/* Yasal metinlerdeki [GELİŞTİRİCİ ADI], [E-POSTA ADRESİ], [ÜLKE/İL] alanlarını doldurur.
   Kullanım: node scripts/fill_placeholders.js "Ad Soyad" "mail@adres.com" "Türkiye" */
const fs = require('fs'), path = require('path');
const [name, mail, place] = process.argv.slice(2);
if (!name || !mail || !place) { console.error('Kullanım: node scripts/fill_placeholders.js "Ad Soyad" "mail@adres.com" "Ülke/İl"'); process.exit(1); }
if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) { console.error('E-posta geçersiz görünüyor.'); process.exit(1); }
const R = path.resolve(__dirname, '..');
const files = ['www/wc_legal_data.js', 'docs/privacy-policy.html', 'docs/terms.html', 'play_store/magaza_metni_TR_EN.md'];
let n = 0;
for (const f of files) {
  const p = path.join(R, f); if (!fs.existsSync(p)) continue;
  let s = fs.readFileSync(p, 'utf8'), t = s.split('[GELİŞTİRİCİ ADI]').join(name).split('[E-POSTA ADRESİ]').join(mail).split('[ÜLKE/İL]').join(place);
  if (t !== s) { fs.writeFileSync(p, t); n++; console.log('güncellendi: ' + f); }
}
console.log(n ? 'Tamam.' : 'Doldurulacak alan bulunamadı (zaten dolu olabilir).');
