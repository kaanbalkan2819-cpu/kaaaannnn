V115 — RANK MAÇI (V114 üzerine; temel testler yapıldı, aşağıdaki "V115 TEST SONUÇLARI" bölümüne bak).

═══ 10 MADDELİK PLAN (uygulananlar) ═══
 1. country_stats.js (YENİ): ülke gizli güç skoru (BASE'in 5 istatistik toplamı) → 4 eşit dilim (ÇOK DÜŞÜK/DÜŞÜK/ORTA/YÜKSEK). Oyuncuya gösterilmez.
 2. Aynı grup kuralı: kurucu grubun ÇİFT sıralı, konuk TEK sıralı ülkelerinden çekilir → iki oyuncu hep aynı tier'da, çakışma imkânsız.
 3. firebase_config.js (YENİ, BOŞ) + firestore.rules (YENİ, proje kökünde): anonim giriş + Firestore kuyruğu/maç/profil kuralları.
 4. ranked.js (YENİ): Firebase yükleme, anonim giriş, takma ad, Elo (1000 / K=32, ilk 10 maç K=48), 6 lig × I–III kademe, liderlik (ilk 100 + kendi sıran), profil kartı.
 5. Eşleşme: kuyruk dokümanı + işlem (transaction) ile rakip "talep etme"; 15 sn içinde bulunamazsa YZ rakip (inandırıcı takma ad, rank'a yakın puan, 5–14 sn düşünme gecikmesi).
 6. "Rakip bulundu" ekranı (12 sn): tek seferlik ülke değiştirme = 250 altın, yine aynı tier'dan.
 7. online.js (kanca): rankedHost / rankedJoin / rankedBot (ülkeler otomatik seçilir, canlı bağlantı yine PeerJS); handoff genelleştirildi; 10 sn yeniden bağlanma; tekrarlanan sıra anlık görüntüsü yoksayma.
 8. Maç kuralları (ranked.js): 45 sn hamle süresi (görünür sayaç, dolunca tur otomatik biter), 30 tur limiti (toplam güçle karar, eşitse beraberlik), rakibi tamamen eleyen kazanır, bağlantı kopunca 10 sn (iki tarafa geri sayım).
 9. Sonuç: iki taraf da Firestore'a bildirir; çelişkide maç GEÇERSİZ (puan değişmez); rakip sessizse kendi bildirimimiz geçerli. Yarıda bırakılan maç = yenilgi (sonraki açılışta işlenir). Lig atlama/düşme animasyonlu.
10. UI: ana menüde "Rank Maçı" düğmesi (v35.js, lacivert-altın .mb.rk, mobilde taşmaz), ranked.css, index.html bağlantıları, wc_legal_data.js + docs/ içine "YZ rakip çıkabilir" cümlesi.

═══ DEĞİŞEN / EKLENEN DOSYALAR ═══
Yeni: country_stats.js, ranked.js, ranked.css, firebase_config.js, ../firestore.rules, README_V114.txt
Değişen: online.js, v20.js, v35.js, index.html, wc_legal_data.js, ../docs/terms.html, ../docs/privacy-policy.html
Yedekler (*.bak114): online.js, v20.js, v35.js, index.html, wc_legal_data.js
v20.js: (a) YZ rakip sırasında bot oyuncu sırasına eklenir (pickActors sarmalayıcı); (b) bot, insan rakibe karşı daha atak (+.55 öncelik; normalde +.18 kalır).

═══ FIREBASE KURULUMU (adım adım) ═══
 1. https://console.firebase.google.com → "Proje ekle" (Spark = ÜCRETSİZ plan yeterli; Analytics gerekmez).
 2. Proje ayarları (⚙) → "Genel" → "Uygulamalarınız" → </> (Web) → takma ad ver → "Uygulamayı kaydet". Çıkan firebaseConfig değerlerini kopyala.
 3. www/firebase_config.js dosyasındaki boş alanları (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId) bu değerlerle doldur.
 4. Sol menü → Build → Authentication → "Başlayın" → Sign-in method → "Anonim" → Etkinleştir → Kaydet.
 5. Build → Firestore Database → "Veritabanı oluştur" → bölge seç (Avrupa için eur3) → "Üretim modunda başlat".
 6. Firestore → "Kurallar" sekmesi → proje kökündeki firestore.rules içeriğini yapıştır → "Yayınla".
 7. Firestore → "Dizinler": gerekli dizinler otomatiktir (tek alan sorguları). Konsolda "dizin gerekli" hatası görürsen bağlantıya tıklayıp oluştur.
 8. (İsteğe bağlı, önerilir) Authentication → Ayarlar → Yetkili alan adları: yayın alan adını ekle. Firestore/Auth kota alarmı kur: Faturalandırma → Bütçe uyarıları.
 9. (Çevrimdışı/APK için isteğe bağlı) Firebase SDK'sını www/firebase/ içine firebase-app-compat.js, firebase-auth-compat.js, firebase-firestore-compat.js (v10.12.2) olarak koy; yoksa gstatic CDN kullanılır.
10. Oyunu aç → Rank Maçı → takma ad gir → Maç Bul. İki ayrı cihazla aynı anda aratınca eşleşmeli.
apiKey boş bırakılırsa: Rank Maçı yine açılır ama gerçek rakip aranmaz (≈3,5 sn sonra YZ rakip), liderlik kapalı, puan yalnızca cihazda tutulur.

═══ GERİ ALMA ═══
 • Hızlı: index.html'den country_stats.js / firebase_config.js / ranked.js script satırlarını ve ranked.css satırını sil → menüde Rank düğmesi kaybolur (v35.js `window.WCRank` yoksa göstermez).
 • Tam: *.bak114 dosyalarını eski adlarına kopyala (online.js.bak114 → online.js, v20.js.bak114 → v20.js, v35.js.bak114 → v35.js, index.html.bak114 → index.html, wc_legal_data.js.bak114 → wc_legal_data.js); yeni dosyaları sil.

═══ RİSK NOTU: YZ RAKİP PUAN ŞİŞİRMESİ ═══
Botla oynanan maç GERÇEK maçla AYNI puanı verir/alır (karar gereği). Sonuçları: (1) kaybetmeyi önlemek için bot maçına uygun rakip seçilebilir/oyuncu yapay zekâya karşı daha kolay puan toplayabilir → liderlik tablosu şişebilir; (2) oyuncuya bot olduğu söylenmez, bu yüzden Kullanım Koşulları ve Gizlilik'e "rakip bulunamazsa yapay zekâ çıkabilir" cümlesi eklendi (wc_legal_data.js + docs/). Mağaza/hukuk için bu metni gözden geçir. Gerekirse CFG içine bot maçı için puan çarpanı (ör. 0.5) eklemek tek satırdır (ranked.js → applyResult).
Gizlilik metninin "hesap açılmaz" cümlesi Rank için artık tam doğru değil (Firebase ANONİM kimlik): yeni eklenen bölüm bunu açıklıyor, ama özet bölümünü de güncellemen önerilir.

═══ TEST EDİLMEDİ — özellikle şunları dene ═══
 • Menü → Rank Maçı: modal açılıyor mu, yeni düğme dar ekranda (360 px) ve yatayda taşıyor mu?
 • İki cihazla eşleşme (transaction yarışı), "rakip bulundu" ekranı, ülke değiştirme (altın düşüyor mu, rakibe yansıyor mu).
 • Ülkelerin otomatik seçilmesi (host: v7Confirm; konuk: hostpick sonrası) ve ilk tur akışı.
 • 15 sn sonra bot: bot sırası (pickActors kancası), bot saldırısı insan ülkesine, handoff dönüşü, "Sıra sende".
 • 45 sn sayaç: savaş animasyonu sırasında duruyor mu, dolunca v5End çalışıyor mu.
 • Bağlantı kopması: uçak modu / sekme kapatma → şerit + 10 sn → kazanan/kaybeden; geri bağlanma (host: peer 'connection', konuk: dial) ve kaçan sıra devrinin yeniden gönderimi.
 • Tur limiti (30 tur): PvP'de T.turn ≥ 60, botta T.turn ≥ 30 kabul edilir; toplam güç = host/guest ülke istatistik toplamı.
 • Sonuç doğrulama: iki taraf tutarlı / çelişkili; Elo güncellemesi + Firestore kuralı (|Δ| ≤ 60, games +1).
 • Firestore güvenlik kuralları (Kural Simülatörü ile): kuyruk "matched" yazımı, maç alanları, players güncellemesi.
 • Liderlik: ilk 100 + kendi sıran (count() sorgusu).
 • adopt() değişikliği: normal (rank dışı) online karşılıklı modda kazanan/kaybeden hâlâ doğru çevriliyor mu.

═══ BİLİNEN SINIRLAR ═══
 • PeerJS istemci-otoriter: hile tamamen engellenmez; iki taraflı bildirim + kural sınırları yalnızca caydırıcıdır.
 • Gold: mevcut altın sistemi kayıt dosyasına (G.gold) bağlıdır, oyun dışında global bakiye yoktur → Rank cüzdanı ayrı saklanır; ilk açılışta kayıtlı seferdeki bakiye bir kez içe aktarılır (v55.js yeni seferlere 99999 veriyor: ücreti anlamsızlaştırabilir).
 • Süre sayacı yalnızca "hamle" aşamasında (ph='act') zorlanır; fetih seçimi vb. ara ekranlarda bekleyen oyuncu rakibi bekletebilir.
 • Karşılıklı kopmada (iki taraf da internetteyken) iki cihaz da rakibi kopmuş sayabilir → çelişkili bildirim → maç geçersiz.
 • İSTENEN İŞLERDEN HENÜZ YAPILMAYANLAR: yok (özellikler eksiksiz kodlandı); asıl eksik doğrulamadır — hepsi TEST EDİLMEDİ.

═══ İKİNCİ YARI — DEVRALMA İNCELEMESİ (başka bir Claude hesabı) ═══
Bu bölüm ilk yarıdan devralan oturumun notudur. YİNE TEST EDİLMEDİ; yalnızca dosyalar okundu ve `node --check` çalıştırıldı.
 • İncelenen: ranked.js, country_stats.js, firestore.rules, firebase_config.js (boş), index.html bağlantıları, online.js/v20.js/v35.js kancaları, ranked.css. Söz dizimi hatası yok.
 • Düzeltilen 1 — Gizlilik metni çelişkisi: "hesap açılmaz / sunucuda veri yok" özet, saklama ve haklar bölümleri Rank (Firebase anonim kimlik) ile çelişiyordu. wc_legal_data.js (TR+EN) ve docs/privacy-policy.html güncellendi. Mağaza yayını öncesi [E-POSTA ADRESİ] / [GELİŞTİRİCİ ADI] alanlarını yine doldur.
 • Düzeltilen 2 — firestore.rules: oyuncu puanı artık yalnızca games +1 olan güncellemede değişebilir (önceden games sabit kalıp puan tekrar tekrar ±60 oynatılabilirdi). Takma ad güncellemesinde puan sabit kalmak zorunda. Kuralları Konsol'a yeniden yapıştır ve Kural Simülatörü ile dene.
 • Dokunulmayan, dikkat edilecek yerler: (a) Rank altını ayrı cüzdandır (G.gold ile bağlı değil); (b) G.over işaret kuralı (w:0 kazandı, -1 yenildi, 1 beraberlik; online.js:155 gönderene göre çeviriyor) kodda okunarak doğrulandı ama çalıştırılmadı; (c) bot maçı puan çarpanı 1 (karar gereği).


═══ V115 TEST SONUÇLARI (Chromium/Playwright, başsız; Firebase SAHTE bellek-içi taklitle denendi) ═══
GEÇTİ:
 • Oyun açılıyor, konsolda JS hatası yok; WCRank/WCStats yüklü; menüde Rank düğmesi var.
 • Güç grupları: 44/43/44/43 ülke; 500 rastgele çekimde kurucu/konuk aynı tier'da, çakışma 0; ülke değiştirme de aynı tier'da kaldı.
 • Elo (ilk 10 maç K=48, sonra 32; beraberlik 0) ve lig/kademe sınırları (Bronz III … Şampiyon) doğru.
 • Menü düğmesi 360×740 dikeyde taşmıyor. 740×360 yatayda kırpılma vardı → ranked.css'e yatay kural eklendi (Rank düğmesi tam satır); düzeldi.
 • Takma ad → hub → Maç Bul akışı; liderlik tablosu sırası; kuyruktaki rakiple eşleşme (match belgesi + iki kuyruk kaydı 'matched'); "Rakip Bulundu" ekranı.
 • Ülke değiştirme: 300 → 50 altın (250 düştü), maç belgesine yansıdı, tier korundu, ikinci hak kapalı.
 • Rakip yoksa 15 sn sonra YZ rakip → 12 sn lobi → oyun açıldı (bot=1, host sırası).
 • 45 sn sayaç: 'act' aşamasında geri sayıyor; süre dolunca tur otomatik bitti (sıra YZ'ye geçti).
 • Sonuç: galibiyet +26 (K=48), sunucu profili güncellendi (games, w, lastMid), "Gümüş III" ekranı.
 • Canlı bağlantı kurulamazsa (PeerJS yok) "Bağlantı kurulamadı – maç sayılmadı" ekranı, bekleyen maç temizleniyor.
HENÜZ TEST EDİLMEDİ (gerçek ağ/iki cihaz gerekir):
 • Gerçek Firebase (kurallar, anonim giriş, count() sorgusu, transaction yarışı) ve iki gerçek cihazla PeerJS eşleşmesi.
 • 10 sn bağlantı kopması/geri dönme (şerit, iki tarafa geri sayım, forfeit), 30 tur limiti, çelişkili sonuç → "MAÇ GEÇERSİZ".
 • Lig atlama/düşme animasyonu görsel kontrolü, tam bir bot maçının sonuna kadar oynanması, APK.
NOT: ÇOK DÜŞÜK ve DÜŞÜK tier'ların güç skoru aralığı aynı çıktı (75–75; ülkelerin çoğu aynı temel puanda). Tier'lar sayıca eşit dilimlerdir; bu iki grup pratikte aynı güçtedir.
