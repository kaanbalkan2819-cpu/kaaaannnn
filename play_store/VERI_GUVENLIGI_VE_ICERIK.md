# Play Console formları — önerilen cevaplar (mevcut kod durumuna göre)
Kod değişirse (özellikle Firebase doldurulursa) bu cevaplar DEĞİŞİR. Son kararı siz verin.

## Veri güvenliği (Data safety)
| Soru | Cevap | Neden |
|---|---|---|
| Veri topluyor / paylaşıyor musunuz? | Evet (yalnızca aşağıdakiler) | Online mod + satın alma |
| Satın alma geçmişi | Toplanır, Google Play tarafından işlenir | Google Play Faturalandırma |
| IP adresi (Online mod, PeerJS sinyal sunucusu) | Toplanır, paylaşılır, "uygulama işlevselliği", isteğe bağlı | Eşleşme için geçici işlenir |
| Firebase doldurulursa: kullanıcı kimliği (anonim) + oyun verisi | Ek olarak beyan edilmeli | Rank Maçı |
| Aktarım sırasında şifreleme | Evet | HTTPS/WSS |
| Silme talebi | Uygulama verisini silerek (hesap yok) | |

## İçerik derecelendirme anketi
Savaş/fetih teması, kan-gore yok, gerçek para kumarı yok, kullanıcı etkileşimi: yalnızca online 2 kişilik oyun (serbest metin sohbeti VARSA "kullanıcı etkileşimi: evet" işaretleyin — `online_chat.js` var, kontrol edin). Beklenen: PEGI 12 / Teen.

## Hedef kitle
13+ (çocuklara yönelik değil). Reklam yok.

## Uygulama içeriği
- Reklamlar: Hayır · Finansal özellikler: Hayır · Sağlık: Hayır · Haber uygulaması: Hayır
- Uygulama erişimi: giriş yok, tüm özellikler açık (Rank Maçı için hesap gerekmez)
- Satın alma ürünleri (Play Console > Para kazanma > Uygulama içi ürünler, TÜKETİLEBİLİR): `gold_50`, `gold_150`, `gold_500`, `gold_1500` — kimlikler `www/v21.js` ile BİREBİR aynı olmalı, fiyatları siz belirlersiniz.
