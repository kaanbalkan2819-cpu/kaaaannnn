V117 — RANK EKRANI YENİ TASARIM (savaş temalı)
Yeni: www/ranked_art.js (madalya + kılıç/balta/mızrak/kalkan/gül çizimleri, hepsi SVG; harici görsel yok).
Değişen: www/ranked.js (hub/badge/rmodal), www/ranked.css, www/index.html (ranked_art.js etiketi).
• Rank ana ekranı: altın çerçeveli bordo-siyah panel (menü/zar diliyle), çapraz kılıç başlık, köşelerde güller, dönen ışınlar, arkada kalkan, iki yanda balta/kılıç/mızrak, 3B salınan madalya (CSS 3D + kayan parlama), zar parşömeni tarzı ad plaketi, lig adı, puan, madalyalı ilerleme çubuğu.
• Galibiyet / Mağlubiyet / Beraberlik / Oran kutuları KALDIRILDI (veri hâlâ saklanıyor, yalnızca gösterilmiyor).
• Madalya yeniden tasarlandı: 6 lig ayrı renk/metal (Bronz, Gümüş, Altın, Platin, Elmas, Şampiyon), dişli kenar, defne dalı, çapraz kılıç + kalkan, alt plaket kademe (I–III; Şampiyon ★). Liderlik, lobi ve sonuç ekranında da aynı madalya.
• Tüm Rank pencereleri (arama, rakip bulundu, liderlik, takma ad, sonuç) aynı çerçeveyle açılır; başka pencereler etkilenmez.
Test: Chromium'da 360×780 ekranda hub, liderlik, arama, takma ad ve lobi ekranları çizilip kontrol edildi; eşleşme/bot/sayaç akışı yeniden çalıştırıldı, hata yok. Gerçek telefonda (özellikle 3B salınma ve SMIL parlama animasyonu, düşük RAM'li cihaz) denenmedi.
Geri alma: index.html'den ranked_art.js satırını sil + ranked.js/ranked.css'i V116'dan geri koy.
