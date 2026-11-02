# GOOGLE PLAY'E YÜKLEME — ADIM ADIM (V116)

## Bu pakette HAZIR olanlar
- Capacitor 8 (hedef API 36 — Play'in 31 Ağustos 2026'dan beri zorunlu kıldığı seviye), Faturalandırma Kütüphanesi 9 (cordova-plugin-purchase 13.x)
- PeerJS artık pakette (`www/peerjs.min.js`), bayraklar açık (`www/flags`), `.bak` ve README dosyaları `_arsiv/` klasörüne taşındı (APK'ya girmez)
- Uygulama simgesi + açılış ekranı (`resources/android`), mağaza görselleri (`play_store/gorseller`), mağaza metni (`play_store/magaza_metni_TR_EN.md`), form cevapları (`play_store/VERI_GUVENLIGI_VE_ICERIK.md`)
- Tek komutla imzalı AAB: `node scripts/release_setup.js --build`  ·  GitHub Actions: `build-release-aab.yml`

## SİZİN yapmanız gerekenler (sırayla — benim yerime yapılamaz)
1. **Play Console geliştirici hesabı** aç (tek seferlik ücret; kimlik doğrulaması gerekir). Yeni kişisel hesaplarda yayından önce zorunlu kapalı test şartı olabilir (test kullanıcısı sayısı + gün) — Play Console'da "Test ve yayın" bölümünde güncel şartı kontrol et.
2. **Yasal alanları doldur:** `node scripts/fill_placeholders.js "Ad Soyad" "mail@adres.com" "Türkiye"`
3. **Gizlilik politikası URL'si:** projeyi GitHub'a yükle → Settings → Pages → `docs/` klasörü. URL'yi Play Console > Uygulama içeriği > Gizlilik politikası'na yaz.
4. **İmza anahtarı:** `scripts/anahtar_olustur.bat` (Windows) veya `.sh`. Oluşan `worldconquest-upload.jks` + `keystore.properties` dosyalarını YEDEKLE, GitHub'a YÜKLEME (`.gitignore` bunları dışarıda tutar). Play Console'da "Play Uygulama İmzalama"yı açık bırak.
5. **AAB üret:** `node scripts/release_setup.js --build` (JDK 21 + Android SDK gerekir; Android Studio Otter ile gelir). Çıktı: `WorldConquest-1.0.0-1.aab`. Her yeni yüklemede `version.properties` içindeki `VERSION_CODE`'u 1 artır.
6. **Uygulama içi ürünler:** Play Console'da 4 tüketilebilir ürün oluştur: `gold_50`, `gold_150`, `gold_500`, `gold_1500`. Satın alma ancak AAB Play'e yüklendikten sonra (dahili test kanalında, test hesabıyla) denenebilir.
7. **Mağaza kaydı:** metinler `play_store/magaza_metni_TR_EN.md`, görseller `play_store/gorseller/`, formlar `play_store/VERI_GUVENLIGI_VE_ICERIK.md`. **Telefon ekran görüntülerini (en az 2) kendin al.**
8. **Önce Dahili test kanalı** → gerçek telefonda: açılış, ses, ekran yönü, üst bar/çentik, satın alma, online mod. Sorunsuzsa Üretim'e çık.

## YAYINDAN ÖNCE KARAR VERMENİZ GEREKENLER
- **appId = `com.wconquest.worldgame`** (`capacitor.config.json`; kişisel ad içermez). Yayınlayınca ASLA değişmez. Play Console'da uygulamayı oluştururken bu ad başkasına aitse hata verir; o zaman yayından ÖNCE `capacitor.config.json`'da değiştirin. Daha önce başka paket adıyla kurduğunuz test APK'ları ayrı bir uygulama sayılır (üstüne kurulmaz, elle kaldırın).
- Başlangıç altını **0**'a indirildi (eski kayıtlardaki 99.999 test altını da bir kez sıfırlanır).
- **Rank Maçı:** önce 15 sn gerçek rakip aranır; bulunamazsa YZ rakip, oyuncunun rank'ına göre zorlukta oynar (1000 puan ≈ çok kolay, 1900+ ≈ tam güç). **Firebase boşsa (`www/firebase_config.js`) gerçek rakip HİÇ aranmaz**, hep YZ rakip çıkar — gerçek eşleşme için Firebase'i doldurun. Doldurursanız Veri güvenliği formunu güncelleyin; yapay zekâ rakibin "gerçek oyuncu" gibi sunulduğu bir tasarım mağaza/kullanıcı güveni açısından riskli olabilir, gizlilik metnindeki "YZ rakip çıkabilir" cümlesi bu yüzden var.
- **Harita/doku kaynağı** (`www/globe/data.js`) doğrulanmadı — lisansını teyit edin (`THIRD_PARTY_NOTICES.txt`).
- Bu pakette **hiçbir şey cihazda çalıştırılarak test EDİLMEDİ** (burada Android SDK yok). Capacitor 8 / API 36'da ekran kenarlarına çizim (edge-to-edge) zorunlu: üst bar ve alt butonların çentik/alt çubuk altında kalmadığını gerçek telefonda kontrol edin.

---
# ESKİ NOTLAR (V111)
# Google Play Yayın Rehberi — World Conquest
(Not: "Overplay" derken Google Play'i kastettiğini varsaydım. Başka bir mağazaysa aynı belgeler büyük ölçüde kullanılır.)

## 1) Önce doldurman gerekenler
- `docs/privacy-policy.html` ve `docs/terms.html` içindeki **[GELİŞTİRİCİ ADI]**, **[E-POSTA ADRESİ]**, **[ÜLKE/İL]** alanlarını doldur.
  Aynı metin oyunun içinde `www/wc_legal_data.js` dosyasında da var; orada da aynı üç alanı ara-değiştir ile doldur.
- `THIRD_PARTY_NOTICES.txt`: harita/doku ve bayrak kaynaklarını doğrula.

## 2) Gizlilik politikası URL'si (Play zorunlu kılar)
Play, uygulama içi metne ek olarak **herkese açık bir URL** ister. En kolayı: projeyi GitHub'a yükle → Settings → Pages → `docs/` klasörünü yayınla.
URL: `https://KULLANICIADIN.github.io/DEPO/privacy-policy.html` → Play Console > Uygulama içeriği > Gizlilik politikası.

## 3) Veri güvenliği formu (Data safety) — önerilen cevaplar
- Uygulama veri toplar mı / paylaşır mı: **Hayır** (hesap, reklam, analiz yok; kayıtlar yalnızca cihazda).
- Satın alma: Google Play Faturalandırma kullanılır (ödeme verisini Google işler).
- Online mod: eşler arası (PeerJS). PeerJS genel sinyal sunucusu IP adresini geçici işler. Play bunu "geçici işleme" sayabilir; emin değilsen Online mod için "IP adresi — uygulama işlevselliği, paylaşılan" olarak beyan etmek daha güvenlidir. Kesin çözüm: kendi PeerJS sunucunu kur ve kütüphaneyi `www/peerjs.min.js` olarak pakete koy (CDN'e bağımlılık kalkar).
- Veri şifreleme/silme talebi: hesap olmadığı için "uygulama verilerini silerek" yeterli.

## 4) İçerik derecelendirme (IARC) ve hedef kitle
- Tema: savaş/fetih stratejisi, kan/şiddet görüntüsü yok → genelde **PEGI 12 / Teen** çıkar. "Gerçek para ile kumar" yok. Rastgele zar var ama para kazandırmaz.
- Hedef yaş: **13+** seçmeni öneririm (çocuklara yönelik değil → Families politikası kapsamına girmezsin).
- Reklam yok: "Uygulama reklam içeriyor mu: Hayır".
- Uygulama içi satın alma var: "Evet".

## 5) Mağaza metni (taslak)
**Kısa (80):** Haritadan ülke seç, diplomasi ve zarlarla dünyayı fethet.
**Uzun:** World Conquest, 3B küre üzerinde oynanan sıra tabanlı bir strateji oyunudur. Bir ülke seç, komşularını keşfet, müttefik kur, politikalarını belirle ve zarlarla savaşarak dünyayı fethet. Müttefiklerin gücü savaşa eklenir; yüzey alanı büyük ülkelerin diplomasisi daha etkilidir. Çevrimdışı oynanır, isteğe bağlı 2 kişilik online mod vardır. Reklam yoktur.
**Ek açıklama:** Oyundaki harita ve ülkeler yalnızca oynanış içindir; siyasi görüş bildirmez.

## 6) Telif ve dava riski — ne yaptık
- Müzik ve ses efektleri **kodla üretildi** (`www/wc_audio.js`); hazır müzik/ses dosyası yok → telif talebi gelmez.
- Gerçek ülke adı ve bayrakları kullanılıyor: bayraklar devlet sembolüdür, genelde serbesttir. Marka/logo (şirket, spor, film) kullanma.
- Ülke sınırları: tartışmalı bölgeler için Play bazı ülkelerde hassastır. Kullanım Koşulları'nda "siyasi görüş bildirmez" notu var; mağaza açıklamasına da koy.
- Yayın öncesi kontrol: `THIRD_PARTY_NOTICES.txt` içindeki doku/harita kaynağı belirsiz; doğrula.

## 7) Teknik kontrol listesi
- İmzalı AAB üret (APK değil), uygulama imzalama anahtarını yedekle.
- Hedef API seviyesi Play'in güncel şartını karşılamalı (Capacitor sürümünü güncel tut).
- `capacitor.config.json` appId: com.worldconquest.game — bir kez yayınlayınca değişmez.
- Altın paketleri için Play Console'da ürün kimlikleri `v21.js` içindekilerle aynı olmalı.
- Test: dahili test kanalıyla gerçek cihazda ses, satın alma ve online mod denenmeli (bu pakette hiçbiri çalıştırılarak test edilmedi).
