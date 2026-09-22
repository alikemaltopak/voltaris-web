# Kaynak CAD dosyaları

Takımın kendi SolidWorks çıktıları. **Bu klasördeki dosyalar aslıdır** — sitedeki
3D modeller bunlardan üretiliyor. Masaüstü ya da İndirilenler klasörü
temizlendiğinde kaybolmasınlar diye buraya alındı ve git'e dahil edildi.

| Dosya | Ne | Kaynak |
|---|---|---|
| `Kabuk_09_ass.STEP` | Aracın dış kabuğu, 9. sürüm montaj. **Güncel olan bu.** | Drive → Kabuk/Kabuk Tasarımı (Haziran 2025) ve İndirilenler |
| `Kabuk_2025-03_eski.STEP` | Kabuğun Mart 2025 tarihli eski sürümü. Karşılaştırma için duruyor. | Drive (`Kabuk.STEP`) |
| `Sasi_duzenleme_cakışma_yok_kare_As_Machined.STEP` | Şasi | Takımdan, Eylül 2025 |
| `Rollbar_RollCage.STEP` | Roll cage / devrilme kafesi | Takımdan, Eylül 2025 |
| `Sasi-Rollbar_montaj.STEP` | Şasi + roll bar montajı. Yalnızca 9 KB: dış parçalara referans veren bir montaj kabuğu, tek başına geometri taşımıyor. | İndirilenler |

## Siteye çıkan aracı yeniden üretme

Üç adım. `$W` geçici bir klasör olsun.

```bash
cd cad-assets

# 1) Kabuk: her katıyı ayrı toleransla, camlar kendi yüzeylerinden ayrılmış olarak
venv/bin/python convert_step.py source/Kabuk_09_ass.STEP "$W/kabuk_parts" \
    0.02 0.04 --split --glass 70,72,52,56,55,53

# 2) Şasi ve roll cage
venv/bin/python convert_step.py source/Sasi_duzenleme_cakışma_yok_kare_As_Machined.STEP \
    "$W/sasi_fine.stl" 0.08 0.2
venv/bin/python convert_step.py source/Rollbar_RollCage.STEP "$W/rollcage_fine.stl" 0.08 0.2

# 3) Montaj, temizlik, malzeme, inceltme, GLB
blender -b -P blender_assemble_voltaris.py -- "$W" ../public/models/voltaris-arac.glb \
    --preview "$W/onizleme"
```

Sonuç: ~108 bin üçgen, ~3 MB. Araç sayfasındaki görüntüleyici bunu kullanıyor
(`src/components/CarViewer.tsx`).

### Sayılar neden bunlar

Toleranslar çözünürlüğü belirler (mm / radyan) ve **kalite buradan gelir.**
Projedeki ilk dönüşüm `tolerance=0.5` ile yapılmıştı; aracın "piksel piksel"
görünmesinin sebebi buydu.

Ama tek bir tolerans da doğru değil. Kabuk yedi katıdan oluşuyor: gövde, dört
tekerlek, iki ayna. Gövdenin ihtiyaç duyduğu 0.02 mm ile çevrildiğinde dört
tekerlek 1,22 milyon üçgen tutuyordu — dosyanın %98'i, kimsenin bakmadığı lastik
dişinde. Bu yüzden `--split` gövdeye ince, tekerlek ve aynalara 30 kat kaba
tolerans veriyor.

### `--glass` numaraları

Kabuk katısının 94 yüzeyi var; listelenen altısı ön cam, yan camlar ve arka cam.
Camları koordinat düzlemiyle kesmek yerine CAD'in kendi yüzey sınırlarından
almanın sebebi şu: eşik değeriyle kesilen sınırlar panel kenarını değil
matematiği takip ediyor, o yüzden eski modelde bütün cam kenarları tırtıklı
çıkmıştı.

Kabuk dosyası değişirse yüzey numaraları da değişir. Yeniden bulmak için
katının yüzeylerini alan/konum/normal olarak listeleyip yüksekte kalan ve
yukarı-ileri ya da yana bakanları seç.

## Neden git'e dahil?

STEP dosyaları `cad-assets/*.STEP` kuralıyla göz ardı ediliyordu. Bu klasör
bilinçli olarak o kuralın dışında: dosyalar toplam ~20 MB ve yerine konamaz
(takımın aylarca çalıştığı tasarım). Depo da gizli.
