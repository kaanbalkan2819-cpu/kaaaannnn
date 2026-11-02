V118 — MENÜ PERFORMANS DÜZELTMESİ (ana menü + Rank)
Sorun: Ana menüdeki 3B küre, Rank/Ayarlar gibi pencere açılınca arkada tam hızla çizilmeye devam ediyordu; Rank hub'ındaki sonsuz dönen ışın + 3B salınan madalya (drop-shadow filtreli) + SVG parlama animasyonu üstüne biniyordu.
Değişen:
• www/v35.js — pencere (#mod) açıkken / uygulama arka plandayken küre ÇİZİLMEZ; dokunmatikte ~30 fps sınırı; antialias dokunmatikte kapalı; çözünürlük tavanı ve küre/yıldız/kıvılcım/ok sayısı düşürüldü; yavaşlık eşiği 30 fps'e göre ayarlandı.
• www/v35.css — taç (crest) dönüş animasyonu + filtresi kapatıldı, gren kapalı.
• www/ranked.css — dönen ışın, 3B salınma ve drop-shadow filtreleri kapatıldı (madalya sabit hafif eğik duruyor).
• www/ranked_art.js — madalyadaki SMIL parlama animasyonu kaldırıldı.
• www/ranked.js — "Rakip Aranıyor" ekranı artık her saniye tüm paneli yeniden kurmuyor, yalnızca sayaç güncelleniyor.
Test: Chromium (yazılım GL, 360×780, dokunmatik) eski/yeni karşılaştırıldı: JS hatası yok, menü + Rank hub açılıyor, pencere açıkken küre çizimi 0, kapanınca devam ediyor. Gerçek telefonda denenmedi.
Geri alma: V117 zip'i.
