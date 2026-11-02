V122 — GERİ TUŞU + KEŞİF BİLGİLERİ
1) Telefon geri tuşu (www/v121.js):
   - Menülerde bir önceki adıma döner (Geri / Vazgeç / Kapat düğmesini bulup basar; Yeni Oyun → Mod seçimi → Geri gibi).
   - Maçta "Maçtan çıkmak istiyor musunuz?" sorar. Evet: tek kişilikte kayıt alınır ve ana menüye dönülür; Rank/online maçta
     terk = yenilgi (mevcut wcr_pending kuralı). Hayır: maça devam. Seçili ülke paneli açıksa önce panel kapanır; duraklatma menüsü açıksa oyuna döner.
   - Ana menüde 2 sn içinde iki kez geri = uygulamadan çıkış.
   - package.json'a @capacitor/app eklendi (kesin çıkış için). Yeni paket olduğundan: `npm install` sonra `npx cap sync android`.
     Paket yoksa history(popstate) yöntemi devreye girer.
2) Keşif bilgisi (www/v121facts.js): ikinci bilgisi olmayan 126 ülkeye 1'er ek bilgi (TR+EN). Artık 174 ülkenin hepsinde en az 2 bilgi var.
Test: cihazda/tarayıcıda ÇALIŞTIRILMADI (yalnızca sözdizimi kontrolü). Geri alma: V120 zip'i.
3) Üst bar yazı tipi: HUD çipleri (altın, ülke adı vb.) artık panelle aynı sans yazı tipini kullanır (www/v121.css).
4) Panel alt düğmeleri: Keşif / Elçi / Diplomasi 3 sütun, SALDIR tam genişlikte altta; artık sağdan taşmaz.
   Geri almak için index.html'deki v121.css satırını sil. Telefonda denenmedi.
5) Fethedilen bölgeye tıklayınca da "📜 Politikalar" menüsü açılır (kendi ülken gibi; Keşif/Saldır düğmeleri gösterilmez). Değişen: www/v17.js (satır ~120), www/v23.js (satır ~299). Telefonda denenmedi.
6) Seçili bölge artık oyuncunun değilse "📜 Politikalar" düğmesi panelden kalkar (www/v121.js sonu). Telefonda denenmedi.
7) V120'nin genel menü/panel/buton görünümü (www/v120.css) devreden çıkarıldı: yalnızca RANK ekranı (ranked.css + madalyalar) yeni görünümde kalır; diğer menüler V119'daki eski hâline döndü.
   Dosyalar silinmedi (www/v120.css, www/ui/*.png); yeniden açmak için index.html'e <link rel="stylesheet" href="v120.css"> satırını geri ekle.
8) Rank dışındaki bütün panel/pencerelerde (alt panel, savaş sayfası, duraklatma/ayarlar, diplomasi vb.) yazı tipi sans (www/v121.css sonu). Rank (.wcr-box) ve açılış ana menü ekranı (#wcm) hariç. Telefonda denenmedi.
9) ALT SİSTEM ÇUBUĞU (geri/ana ekran/son uygulamalar) oyunda GİZLİ; oyuncu ekranın en altından yukarı çekince geçici görünür.
   Native (Java) değişiklik: scripts/android_immersive.js MainActivity.java'yı yamar; release_setup.js ve build_debug_apk.bat otomatik çağırır.
   ÖNEMLİ: yeni APK derlemeden önce `node scripts/release_setup.js` (veya setup_android_windows.bat) ya da build_debug_apk.bat çalıştırın. Cihazda denenmedi.
