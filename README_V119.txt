V119 — RANK MADALYALARI
1) "i" ve "ü" sorunu: Lig adı JS toUpperCase() ile büyütülüyordu (i→I, Platin→PLATIN, Şampiyon→ŞAMPIYON). Artık toLocaleUpperCase('tr') kullanılıyor: PLATİN, ŞAMPİYON, GÜMÜŞ (www/ranked.js). İngilizce modda en-US.
2) Gerçekçi madalyalar: www/medals/m_<lig>_<kademe>.png (16 dosya, 300x360, şeffaf). Kabartma + metal yansıması + patina/oksit, çizik, çukur, toz.
   Bronz: yeşil patina + ağır toz | Gümüş: kararmış | Altın: hafif eskimiş/tozlu | Platin/Elmas/Şampiyon: temiz, hafif çizik.
   www/ranked_art.js PNG'yi kullanır; dosya bulunamazsa eski SVG madalyaya döner.
3) Yeniden üretmek için: scripts/ranked_real.js (çizim) + scripts/bake_medals.js (npm i canvas; node bake_medals.js). Yaşlanma/toz miktarı ranked_real.js içindeki MAT tablosunda (tarn, dust, scr).
Not: Telefonda denenmedi. Adobe: bu ortamda Adobe'nin görsel üretme (text-to-image) aracı yok; kullanılmadı.
Geri alma: V118 zip.
