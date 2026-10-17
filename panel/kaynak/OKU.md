# kaynak/

Veri scriptlerinin girdileri buraya konur (bu dökümde yok; boyut ve gizlilik nedeniyle):

| Dosya | Nereden | Kullanan |
|---|---|---|
| Bölüm_1 … Bölüm_7 PDF'leri (2026 Elektrikli Araç Yarışı Resmi Kurallar) | teknofest.org / Claude'daki "VOLTARİS Teknik Asistan" projesi | build_sart.py, build_fig.py |
| Sürücüler_İçin_Lisans_İşlemleri.pdf | aynı | build_sart.py |
| VOLTARIS_INDEKS.xlsx | Voltaris Google Drive | build_indeks.py |
| Voltaris_Teams_haritasi.csv | Voltaris Teams haritası E-Tablosu → CSV indir | build_indeks.py |

Dosya adında Türkçe karakter ve boşluk farkı önemli değil; adında "Bölüm_2", "Lisans", "VOLTARIS_INDEKS", "Teams_harita" geçmesi yeterli.
Başka bir klasör kullanmak için: `VOLTARIS_KAYNAK=/yol python3 scripts/build_sart.py ...`
