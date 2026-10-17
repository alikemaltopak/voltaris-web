// Araç kalemleri. reqs: [madde, kaynak, tür, nasıl yapılır/kontrol edilir]
// tür A = ARAÇ (teknik kontrol ve videolarda aranır), R = RAPOR (Teknik Tasarım Raporu'nda sunulur).
// Kaynaklar: B1..B7 = 2026 Bölüm_1..7. "Ek 1" = Bölüm_2 Ek 1 Ceza Listesi.
// ets = bağlı olduğu teknik kontrol etiketleri (2026 plakası). q = Drive araması için kelimeler.
// Kaynak yazımı: "B2 9.2.k" = Bölüm 2, madde 9.2, (k) bendi. "Ek 1" = Bölüm 2 Ek 1 Ceza Listesi. "LIS" = Sürücüler İçin Lisans İşlemleri.
const ITEMS = [
 { id:'sasi', name:'Şasi', birim:'M', ets:['mekanik'], parts:['Sasi'], deps:[], q:['şasi','sasi','chassis'], reqs:[
   ['Motor, süspansiyon, direksiyon ve fren güvenle bağlanabiliyor','B2 9.9.a','A','Her bağlantı noktasını gez: cıvatalar yerinde ve sıkı mı, kaynaklarda çatlak var mı, bağlantı plakası esniyor mu. Teknik kontrolde güvensiz bulunan şasiyle yarışa girilemez (B2 9.9.d).'],
   ['Taşınan yükler (alet çantası, şarj kablosu) sabitlenmiş','B2 9.9.e','A','Araçta taşınacak her şeyin listesini çıkar ve her biri için kayış veya braket yeri belirle. Sürüşte savrulabilecek hiçbir şey serbest kalmamalı.'],
   ['Sürücü içindeyken yerden yükseklik ≥ 10 cm','B2 8.1.f','A','Sürücü koltuktayken önden, arkadan, sağdan ve soldan metreyle ölç; dördü de ≥ 10 cm olmalı. Teknik onay videosunda bu dört ölçüm gösteriliyor (B2 11.3.3.f). Eksikse diskalifiye.'],
   ['Dingil ≥ 130 cm; ön iz ≥ 100 cm, arka iz ≥ 80 cm','B2 8.1.d-e','A','Ön ve arka teker merkezleri arasını ölç (dingil); her aksta iki teker merkezi arasını ölç (iz). İki iz de araç genişliğinin yarısından büyük olmalı.'],
   ['Araç ağırlığı (sürücüsüz) ≤ 350 kg','B2 8.1.g','A','Aracı kantarda tart veya parça ağırlıklarını topla. Sınır sürücüsüz ağırlık için; balast ayrıca hesaplanır (B2 8.6).'],
   ['Şasi tipi, malzeme ve üretim adımları görsellerle','B3 11.2.b','R','TTR\'de şasi tipini, malzemeyi ve neden seçildiğini yaz; üretimin her adımının fotoğrafını ekle. Üretim sırasında fotoğraf çekmeyi unutma, sonradan çekilemez.'],
   ['Ağırlık bağlama noktaları görsellerle','B3 11.2.c','R','Batarya, motor, koltuk gibi ağır parçaların şasiye nereden bağlandığını işaretli görsellerle göster.'],
   ['Önde ve arkada birer çelik çekme halkası, iç çap ≥ 20 mm','B2 9.11.a-b','A','Halkalar şasiye bağlı, kırmızı veya sarı boyalı ve dışarıdan görünür olmalı; arka halka aks açıklığının tam ortasında. Yoksa veya iç çap 20 mm altıysa diskalifiye (Ek 1).'] ]},
 { id:'rollcage', name:'Roll Bar / Roll Cage', birim:'M', ets:['mekanik'], parts:['RollCage'], deps:['sasi'], q:['rollbar','roll cage','rollcage'], reqs:[
   ['Çelik, akma dayanımı ≥ 200 MPa','B2 9.8.h','A','Kullanılan borunun malzeme sertifikasını veya faturasını bul. Alüminyum, karbon fiber kafes kabul edilmez; eksikse diskalifiye.'],
   ['Boru ≥ Ø30×1,5 mm veya kutu ≥ 25×25×1,5 mm','B2 9.8.f','A','Kumpasla dış çapı ve et kalınlığını ölç. Profil kapalı ve haddelenmiş olmalı; açık veya kaynakla kapatılmış profil kabul edilmez.'],
   ['Şasiye en az 4 noktadan, M8 8.8 cıvata veya kaynak','B2 9.8.b,d','A','Her roll bar\'ın şasiye bağlandığı noktaları say; cıvataların başındaki kalite işaretine (8.8) ve çapına bak. Cıvatalar arası ≥ 2,5D, kenara ≥ 1,5D.'],
   ['Ön bar simidin ≥ 3 cm, arka bar kaskın ≥ 5 cm üstünde','B2 9.8.u-v','A','Sürücü kasklı ve yarış pozisyonunda otururken ölç. Kask iki barın tepesini birleştiren çizginin altında kalmalı.'],
   ['Tek parça profil, ek veya delik yok','B2 9.8.j,l','A','Barları uçtan uca kontrol et: eklenerek uzatılmış parça, hafifletme deliği veya bağlantı dışı kaynak olmamalı. Delik ihraç sebebi.'],
   ['1 kN yükte yatay yer değiştirme ≤ H/200 (ön ve arka)','B3 11.3.c','R','Ön ve arka barın tepesine 1 kN yatay kuvvet uygulayan analizi yap (elle veya yazılımla). H = barın alt ve üst noktası arasındaki yükseklik.'],
   ['Kafesin CAD ve analiz dosyaları','B3 11.3','R','Kafesin CAD dosyasını ve analiz dosyasını Drive\'a koy, TTR\'ye link olarak ekle.'] ]},
 { id:'fren', name:'Fren, Tekerlek, Süspansiyon', birim:'M', ets:['dinamik','mekanik'], parts:['Tekerlek'], deps:['sasi'], q:['fren','süspansiyon','jant','knuckle'], reqs:[
   ['Her tekerde mekanik fren','B2 8.3.b','A','Dört tekerin her birinde disk ve kaliper olduğunu kontrol et. Bir teker bile eksikse diskalifiye.'],
   ['Tek pedallı, çift devreli hidrolik hat','B2 8.3.a,c','A','Ana merkezden çıkan iki ayrı hattı takip et (ön-arka veya çapraz). Bir hattı devre dışı bırakınca diğeri hâlâ frenlemeli. Tel fren ve manet tipi merkez kabul edilmez.'],
   ['Metal pedal, geri dönüş yayı, merkeze rijit bağlı','B2 8.3.e,g,i','A','Pedal çelik sac olmalı, bırakınca yay geri getirmeli; pedal ile ana merkez mili arasında boşluk olmamalı.'],
   ['10° rampada kaymadan duruyor','B2 8.3.l-n','A','En az 10° eğimli bir rampa bul veya yap; araç burnu aşağıdayken frende tutup bırak, yeniden frene bas. Tekerler dönmeden durmalı. Fren testi videosu da böyle çekiliyor (B2 11.2).'],
   ['90/90-16 veya 17 lastik, tüm jantlar aynı','B2 8.7.b','A','Lastik yanağındaki ölçüyü oku; jant genişliği ideal 55 mm, en fazla 63,5 mm. Lastikleri TÜBİTAK verirse onlar kullanılmak zorunda.'],
   ['Fren Sistemi başlığı (250 puan)','B1 2.4','R','TTR\'nin fren bölümü için tasarım, hesap ve test sonuçlarını topla.'],
   ['Lastik basıncı ≤ 33 psi (2,3 bar), sırt derinliği ≥ 1,6 mm','B2 8.7.d,f','A','Lastikleri manometreyle ölç, sınırın üstüne şişirme. Sırt derinliğini derinlik ölçerle kontrol et. Basınç fazla çıkarsa o yarış hakkı kullanılmış sayılır.'] ]},
 { id:'direksiyon', name:'Direksiyon', birim:'M', ets:['dinamik','mekanik'], parts:['Direksiyon'], deps:['sasi'], q:['direksiyon','kremayer','steering'], reqs:[
   ['Kremayer-pinyon, şasiye cıvatalı, fiberli somun veya güvenlik teli','B2 9.14.g','A','Direksiyon kutusunun kremayer-pinyon olduğunu ve şasiye cıvatayla oynamadan bağlandığını kontrol et. Her somun fiberli olmalı ya da telle emniyete alınmalı.'],
   ['Kapalı simit, soldan direksiyon','B2 9.14.a-b','A','Simit tam halka olmalı (joystick, yarım simit olmaz) ve sürücü solda oturmalı.'],
   ['Simit boşluğu ≤ 7°','B2 9.14.e','A','Tekerleri sabit tutup simidi iki yöne çevir, tekerler oynamadan simidin döndüğü açıyı ölç. 7°\'den fazlası diskalifiye; teknik onay videosunda gösteriliyor.'],
   ['Aşırı dönüşe karşı stoper, zincir-dişli yok','B2 9.14.f,h','A','Simidi iki yöne sonuna kadar çevir: mekanik bir durdurucu tekerin kilitlenmesini engellemeli. Sistemde zincir veya dişli aktarma olmamalı.'],
   ['Rot kolu kuvveti, emniyet katsayısı, kamber ve açı-tork grafikleri','B3 11.5','R','Tam tur çevrim için rot kolu kuvvet grafiği, emniyet katsayısı, kamber değişimi ve simit açısı-tork grafiği hazırla.'] ]},
 { id:'koltuk', name:'Koltuk ve Kemer', birim:'M', ets:['mekanik','tasit'], parts:['Koltuk'], deps:['rollcage'], q:['koltuk','kemer','seat'], reqs:[
   ['FIA sertifikalı, tek parça sürücü koltuğu','B2 8.5.b,h','A','Koltuğun FIA etiketini bul ve fotoğrafla. Süresi dolmuş ama hasarsız FIA koltuk kabul ediliyor; katlanabilir koltuk kabul edilmiyor. Yoksa diskalifiye.'],
   ['Koltuklar yan yana, arada ≥ 90 mm, aynı düzlemde','B2 8.5.a,g','A','İki koltuğun birbirine en yakın noktaları arasını ölç.'],
   ['Sırt açısı düşeyle ≤ 30°, şasiye sağlam','B2 8.5.e','A','Açıölçerle sırtlığın dikeyle yaptığı açıyı ölç; koltuğu sallayarak bağlantının oynamadığını kontrol et.'],
   ['İki koltukta 5 noktalı FIA kemer','B2 9.5.b','A','Her iki koltukta da 5 noktalı, FIA onaylı kemer olmalı. TÜBİTAK kemer verirse onlar kullanılmak zorunda.'],
   ['Kemer noktaları her yönde 200 N','B2 9.5.g','A','Her bağlantı noktasını yaklaşık 20 kg\'lık kuvvetle her yöne çek; esneme veya oynama olmamalı. Kasık kayışı gövdenin altından, omuz kayışları omuz hizasının altından bağlanır.'],
   ['Yolcu koltuğu ölçüleri, montajı ve konumu görsellerle','B3 11.4','R','Yolcu koltuğunun ölçülerini, ağırlığını, şasiye montajını ve araç içindeki konumunu görsellerle hazırla. Kendi tasarımınızsa yük analizleri de gerekiyor.'],
   ['Kokpit: kemer çözmeden kumandalara ulaşma, yardımsız iniş-biniş','B2 9.13','A','Sürücü kemerli otururken direksiyon, pedallar, acil stop ve far düğmesine uzanabilmeli; hiçbir yere sıkışmamalı. Kokpit yetersiz veya güvensizse diskalifiye (Ek 1).'] ]},
 { id:'kabuk', name:'Kabuk', birim:'M', ets:['mekanik'], parts:['Govde','Tel_Govde'], deps:['sasi','rollcage'], q:['kabuk','gövde','govde'], reqs:[
   ['Kuşbakışı tekerlekler ve süspansiyon gövde içinde','B2 8.2.a','A','Araca yukarıdan bak (veya üstten fotoğraf çek): tekerlekler ve süspansiyon tamamen kabuğun altında kalmalı. Eksikse diskalifiye.'],
   ['Önde ve arkada erişim kapağı (batarya, gövde altı)','B2 8.2.d; B2 9.2.e; Ek 1','A','Kabuğun önünde ve arkasında açılabilen kapak olmalı; bataryaya hiçbir parçayı sökmeden ulaşılabilmeli. Yoksa diskalifiye.'],
   ['Üstü kapalı; keskin kenar ve çıkıntı yok','B2 8.2.c,i,j','A','Elini kabuğun dış ve iç kenarlarında gezdir; kesik, sivri köşe, çıkıntı varsa zımparala veya kenar koruyucu tak.'],
   ['Kokpit ile enerji bölmesi arasında yanmaz seperatör','B2 8.2.l-n','A','Sürücü ile batarya bölmesi arasında karbon fiber veya sac bir perde olmalı; tavan ve yan duvarları kapatmalı, boşluk kalmamalı.'],
   ['Yükseklik ≥ 100 cm, genişlik 110–180 cm, uzunluk 200–425 cm','B2 8.1.a-c','A','Aracın dış ölçülerini aynalar hariç ölç. Yükseklik genişliğin 1,25 katını geçmemeli. Sınır dışı her cm için ceza süresi var.'],
   ['Kabuk üretim adımları, yöntem ve malzeme görsellerle','B3 11.2.a','R','Kalıp, laminasyon, kesim adımlarının fotoğraflarını üretim sırasında çek; malzeme seçimini gerekçesiyle yaz.'],
   ['Örtülemeyen keskin kısımlar yastıklı veya sarı-siyah işaretli','B2 9.16.a','A','Aracın içinde ve dışında çıkıntı yapan parçaları yastıkla; örtülemeyenleri sarı-siyah şeritle işaretle.'] ]},
 { id:'kapi', name:'Kapılar ve Camlar', birim:'M', ets:['mekanik'], parts:['Cam'], deps:['kabuk'], q:['kapı','menteşe','cam'], reqs:[
   ['İki yanda birer kapı, öne açılır','B2 8.4.c,e','A','Sağ ve solda birer kapı olmalı, menteşe önde olmalı. Araç yan yatarsa sürücü en az bir kapıdan çıkabilmeli.'],
   ['Kapı ≥ 50×80 cm ve ≥ 0,4 m²','B2 8.4.f-g','A','Kapı açıklığını ölç; 50×80 cm\'lik bir çerçeve kapıdan geçebilmeli. Geçmezse diskalifiye.'],
   ['Dıştan anahtarla kilitlenir, kilitliyken içeriden açılır','B2 8.4.n','A','Kapıyı dışarıdan anahtarla kilitle: dış kol açmamalı, iç kol açmalı. Cırt cırt, sürgü, koli bandı kabul edilmez.'],
   ['Kendiliğinden kapanır, açıkken sabit durur','B2 8.4.o','A','Kapıyı it: kendiliğinden kapanıp kilitlenmeli. Açıkken menteşeden sarkmamalı. Kol kullanmadan kapanmıyorsa ceza süresi.'],
   ['Kırılmaz ön cam, iki yan pencere, çalışan silecek','B2 9.12','A','Cam pleksiglas veya polikarbonat olmalı. Silecek yardımsız en az 5 kez sürekli çalışmalı; yoksa veya çalışmıyorsa ceza süresi.'],
   ['Kapı mekanizması anlatımı, kilit videosu veya simülasyonu','B3 11.6','R','Menteşe, kol ve kilit mekanizmasının çalışmasını görsellerle anlat; dışarıdan kilitliyken içeriden açıldığını gösteren video veya simülasyon hazırla.'] ]},
 { id:'motor', name:'Motor', birim:'E', ets:['dinamik','motor'], parts:['Motor'], deps:['sasi'], q:['motor','hub motor','BLDC'], reqs:[
   ['Toplam anlık güç ≤ 5 kW','B3 3.a','A','Motor(lar)ın tepe gücünü datasheet\'ten topla; sürücü akım limitini de buna göre ayarla. Ölçümde 5 kW aşılırsa diskalifiye.'],
   ['Motor etiketi okunur, datasheet hazır','B3 3.1.e','A','Motorun üstündeki etiket veya seri numarası okunur olmalı; orijinal datasheet\'i yazdır ve teknik kontrole götür.'],
   ['Kendi tahrikiyle geri gidebiliyor','B2 9.20','A','Aracı motorla geri sür. Dinamik sürüş testinde geri sürüş bölümü var.'],
   ['Motor özellik tablosu (Tablo 4) eksiksiz','B3 3.1.d','R','Tip, faz gerilimi, güç, hız, ağırlık, verim, sargı şeması ve test yöntemi satırlarını doldur.'],
   ['Performans grafiklerinde çalışma bölgesi işaretli','B3 3.1.c','R','Hız, tork, akım, güç ve verim grafiklerini üreticiden al veya deneyle çıkar; kullanacağınız çalışma bölgesini işaretle.'] ]},
 { id:'surucu', name:'Motor Sürücüsü', birim:'E', ets:['dinamik','surucu'], parts:['V_Surucu'], virtual:true, deps:[], q:['motor sürücü','motor surucu','inverter','driver'], reqs:[
   ['Su, yağ ve toza karşı kapalı muhafaza','B3 4.a','A','Sürücü kartı kapalı bir kutuda olmalı. Muhafazasız sürücüyle yarışa girilemez.'],
   ['Motor, batarya ve diğer ünitelere fiş konektörlü bağlantı','B3 4.c','A','Sürücüye giren ve çıkan her kablo sökülebilir konektörle bağlanmalı. Yoksa ceza süresi.'],
   ['Teknik kontrolde sökülüp gösterilebilecek montaj','B3 4.b','A','Hakem istediğinde sürücüyü araçtan söküp devreyi gösterebilmelisiniz; montajı buna göre tasarla.'],
   ['Özellik tablosu ve koruma fonksiyonları (Tablo 5)','B3 4','R','Akım ve gerilim değerleri, çalışma frekansı, kontrol yöntemi ve koruma fonksiyonlarını (aşırı akım, gerilim, ısı, HALL, faz kopması) tabloya yaz.'] ]},
 { id:'batarya', name:'Batarya Paketi', birim:'E', ets:['dinamik','batarya'], parts:['Batarya_Kutu','Batarya_Fan'], deps:['sasi'], q:['batarya','hücre','battery pack'], reqs:[
   ['Lityum iyon hücre (LiPo değil)','B2 9.2.a','A','Hücre datasheet\'inden kimyayı kontrol et: NMC, LFP veya LTO uygun; LiPo kullanılamaz.'],
   ['%100 doluyken açık devre ≤ 150 V','B2 9.2.k','A','Paketi tam doldurup yüksüzken multimetreyle ölç. 150 V üstü diskalifiye.'],
   ['Yanmaz, sızıntıyı tutan kap; şasiye M8 8.8','B2 9.2.c,f','A','Batarya kutusunun malzemesini kontrol et ve kutuyu şasiye en az M8, 8.8 kalite cıvatayla bağla. İnce vida diskalifiye.'],
   ['Kokpitle arasında 5 dk yangına dayanıklı duvar','B2 9.1.a','A','Batarya bölmesi ile kokpit arasında alev ve gaz geçirmeyen sabit bir duvar olmalı; boşluklar ısıya dayanıklı metal bantla kapanmalı.'],
   ['Hızlı sigorta ve service disconnect','B2 9.2.g,l','A','Paket çıkışında kolay görülen hızlı sigorta (gerilim × sigorta akımı ≤ 5 kW) ve elle ayrılabilen bir kesici olmalı.'],
   ['Söküm gerektirmeden erişilebilir','B2 9.2.e','A','Kaput, koltuk veya BMS sökmeden bataryaya ulaşılabildiğini dene.'],
   ['"Yüksek gerilim" uyarı işaretleri','B2 9.2.j','A','Paket üzerine ve kabukta bataryanın olduğu yere yüksek gerilim etiketi yapıştır.'],
   ['Batarya paketleme bölümü ve Tablo 7','B3 7','R','Hücre ve paket özellikleri, ısıl analiz, yerleşim, soğutma, kutu tasarımı ve preşarj devresini anlat; Tablo 7\'yi doldur.'],
   ['Tek enerji kaynağı batarya; harici besleme yok','B2 7.c; Ek 1','A','Araçta ikinci bir enerji kaynağı (ek akü, yakıt hücresi) olmamalı. Harici batarya beslemesi bulunursa batarya kapasitesi kadar saniye ceza.'] ]},
 { id:'bms', name:'BMS', birim:'E', ets:['bys'], parts:['Batarya_Hucre'], deps:[], q:['BMS','BYS','batarya yönetim'], reqs:[
   ['≥ 2 sıcaklık sensörü + 1 test sensörü','B2 9.2.i','A','Pakette en az iki sabit sıcaklık sensörü ve hakemin test için kullanacağı bir ek sensör olmalı. Yanlış yerleşim diskalifiye.'],
   ['55°C sesli (80 dB) ve ışıklı uyarı, 70°C kesme','B2 9.2.i','A','Test sensörünü ısıtarak dene: 55°C civarında 2 m\'den 80 dB sesli ve ışıklı uyarı, 70°C civarında kesme olmalı (±15°C tolerans).'],
   ['Hücre dengeleme çalışıyor','B2 Ek 1','A','Hücreleri bilerek farklı gerilimde bırak ve dengelemenin farkı kapattığını göster. Çalışmazsa ceza süresi.'],
   ['SoC hesabı doğru','B2 Ek 1','A','Paketi bilinen bir şarj seviyesine getir ve BMS\'in gösterdiği SoC ile karşılaştır. Hatalıysa ceza süresi.'],
   ['BYS özellik tablosu','B3 6','R','Seri/paralel hücre sayısı, çıkış gerilimi ve akımı, dengeleme yöntemi, devre tipi, SoC yöntemi ve entegre kodunu tabloya yaz.'] ]},
 { id:'ysb', name:'Yerleşik Şarj Birimi', birim:'E', ets:['ysb'], parts:['V_YSB'], virtual:true, deps:['bms'], q:['şarj','yerleşik şarj','charger'], reqs:[
   ['≥ 500 W, tek faz 85–264 Vac','B3 8.i-ii','A','Şarj birimini prizden çalıştırıp çektiği gücü ölç. Teknik kontrolde aracın kendi bataryası şarj edilerek denenir.'],
   ['Yüksek frekans trafolu galvanik izolasyon','B3 8.iv','A','Şebeke ile batarya arasında yüksek frekans trafosu olmalı. 50 Hz trafo, triyak veya doğrultup düşüren devre kabul edilmez.'],
   ['BMS ile seri haberleşme; kopunca şarj durur','B3 8.xi','A','Şarjı BMS başlatıp durdurmalı ve akımı belirlemeli. Haberleşme kablosunu çekince şarj durmalı.'],
   ['Şarj takılıyken araç hareket etmez','B2 4.p','A','Şarj kablosu takılıyken gaz pedalına bas; araç hareket etmemeli.'],
   ['YŞB özellik tablosu ve şarj algoritması','B3 8','R','Güç, gerilim aralıkları, topoloji ve şarj algoritmasını tabloya ve metne yaz.'] ]},
 { id:'izolasyon', name:'İzolasyon İzleme', birim:'E', ets:['izolasyon'], parts:['V_Izolasyon'], virtual:true, deps:[], q:['izolasyon','isolation monitor'], reqs:[
   ['Cihaz araçta var ve çalışıyor','B2 Ek 1','A','İzolasyon izleme cihazını takın ve bir izolasyon hatası simüle ederek uyarı verdiğini gösterin. Yoksa diskalifiye.'],
   ['Uyarı sesi yeterli seviyede','B2 Ek 1','A','Uyarı sesini araç dışından duyulacak seviyede ayarla; düşük ses diskalifiye.'],
   ['İzolasyon İzleme Cihazı başlığı (150 puan)','B1 2.4','R','TTR\'de cihazın çalışma prensibini, devresini ve test sonuçlarını anlat.'] ]},
 { id:'aks', name:'Araç Kontrol Sistemi', birim:'E', ets:['dinamik','aks'], parts:['Kokpit'], deps:[], q:['AKS','araç kontrol','VCU'], reqs:[
   ['Ayak hız pedalı, frenin sağında, bırakınca geri döner','B2 7.a','A','Gaz pedalı ayakla basılan, fren pedalının sağında ve yaylı olmalı. Elle çevrilen potansiyometre kabul edilmez.'],
   ['Hız sabitleme frene basınca kapanır','B2 7.b','A','Hız sabitleme varsa 30 km/sa üstünde devreye girmeli ve frene dokununca kapanmalı.'],
   ['AKS ana fonksiyonları blok şemayla','B3 9.1.1','R','AKS\'nin hangi birimlerden veri alıp neyi kontrol ettiğini blok şemayla çiz.'],
   ['Yazılım algoritması','B3 9.1.2','R','Yazılımın akış şemasını ve temel algoritmasını TTR\'ye ekle.'] ]},
 { id:'telemetri', name:'Telemetri ve Gösterge', birim:'E', ets:['aks'], parts:['Ekran'], deps:['aks'], q:['telemetri','telemetry','gösterge'], reqs:[
   ['Telemetri sistemi var ve uygun','B2 Ek 1','A','Araçtan pit bilgisayarına veri gönderen bir sistem olmalı. Yoksa diskalifiye.'],
   ['Hız telemetride; sürücünün görüş alanında gösterge','B2 9.18','A','Hız bilgisi telemetri bilgisayarında ve sürücünün görebileceği bir göstergede olmalı. Telefon kullanılamaz; harici gösterge ceza süresi getirir.'],
   ['1080p, sesli, dahili bataryalı araç içi kamera','B2 9.21','A','Kokpiti, direksiyonu ve yolu gören bir kamera tak; ekranda doğru tarih ve saat görünmeli. Yarış kaydı yüklenmezse ceza.'],
   ['Telemetri sistemi bölümü','B3 9.2','R','Telemetri donanımını, iletilen verileri ve arayüzü TTR\'de anlat.'] ]},
 { id:'elguv', name:'Elektrik Güvenliği ve Kablaj', birim:'E', ets:['elektrik'], parts:['V_AcilStop'], virtual:true, deps:[], q:['kablaj','acil stop','elektrik şeması','sigorta'], reqs:[
   ['İçte ve dışta kontaktörlü iki acil stop','B2 4.e','A','İç düğme sürücünün görüş alanında, dış düğme sol tarafta kokpit penceresinin altında olmalı. Basınca kontaktör BMS ve AKS dahil her şeyi kesmeli. Teknik kontrolde araç hareket halindeyken denenir.'],
   ['Kablolara uygun sigorta; akü çıkışında devre kesici','B2 4.f,l','A','Her kablonun kesitine göre sigortası olmalı; akü çıkışında tüm aracı kesen DA devre kesici olmalı.'],
   ['Kablolar kanalda, kılıflı, standart renkte; açık uç yok','B2 4.h-i','A','Tüm kablajı gez: açıkta bağlantı, izolesiz uç, dağınık kablo kalmamalı; demetler kelepçeli olmalı. Açık bağlantı diskalifiye.'],
   ['Kablo akımı ≤ 5 × kesit (mm²)','B2 4.k','A','Her hattın taşıdığı en yüksek akımı kesitle karşılaştır (ör. 16 mm² kablo en fazla 80 A). Akü ve motor kabloları en az 4 mm².'],
   ['Tüm elektrik bileşenleri en az IP44','B2 4.d','A','Her elektrik bileşeninin IP sınıfını datasheet\'ten kontrol et; IP55 önerilir.'],
   ['A4 araç elektrik şeması (güç dağıtımı)','B2 3; B1 2.4','R','Akü, sigortalar, kesiciler, sürücü, motor, şarj birimi ve kabloları gösteren A4 şemayı ve üstten yerleşim çizimini hazırla; teknik kontrole basılı götür.'] ]},
 { id:'aydinlatma', name:'Aydınlatma, Korna, Aynalar', birim:'E', ets:['tasit'], parts:['Far','Stop','Ayna'], deps:['kabuk'], q:['far','stop lambası','korna'], reqs:[
   ['İki beyaz far, 25 m\'den görünür, düğmeyle açılır','B2 9.19.c','A','Gündüz 25 m uzaktan iki farın da göründüğünü kontrol et; sürücü düğmeyle açıp kapatabilmeli.'],
   ['İki stop lambası, frene basınca hemen yanar','B2 9.19.a-b','A','Frene yarım basınca bile iki lamba yanmalı; gündüz 25 m\'den görünmeli. Yoksa diskalifiye.'],
   ['3 sn boyunca 80 dB(A) korna','B2 9.17','A','Kornaya 3 sn bas, 2 m uzaktan telefonla ses ölç. 80 dB altı diskalifiye.'],
   ['İki dikiz aynası, her biri ≥ 50 cm²','B2 9.10.a','A','Aynaların yansıtma alanını ölç. Sürücü 5 m arkadaki A4 levhadaki rakamları aynalardan okuyabilmeli.'] ]},
 { id:'surus', name:'Sürücü ve Ekipman', birim:'O', ets:['dinamik','tasit'], parts:[], deps:[], q:['sürücü','lisans','tulum'], reqs:[
   ['Sürücü ve yedek sürücü belirlendi','B1 2.1.2.i; B2 8.6.c,h','A','Bir sürücü ve bir yedek sürücü seç (danışman olamaz). En hafif sürücüye göre balast hesaplanır; sürücü ağırlığı ekipmanla en az 70 kg.'],
   ['Sporcu lisansları alındı','B5 2.2; LIS 3','A','Sürücüler İçin Lisans İşlemleri belgesindeki adımlarla iki sürücünün sporcu lisansını çıkar; idari kontrolde isteniyor.'],
   ['FIA tulum; kask, yanmaz eldiven ve ayakkabı','B2 9.6','A','Tulum FIA sertifikalı olmalı. Kask kapalı veya yarım, vizörlü olmalı; bisiklet kaskı olmaz.'],
   ['2 kg (veya 2×1 kg) C tipi yangın söndürücü','B2 9.7','A','Kuru kimyevi tozlu, son kullanma tarihi geçmemiş söndürücüyü sürücünün uzanabileceği yere sökülebilir şekilde sabitle.'],
   ['Acil tahliye ≤ 10 sn (sürücü ve yedek)','B2 9.22','A','Kasklı, kemerli, eller direksiyonda, kapılar kapalıyken komutla aracı terk etme süresini ölç. İki kişi de 10 sn altında olmalı.'] ]},
 { id:'logo', name:'Logo, Numara, Görsel Tasarım', birim:'O', ets:[], parts:[], deps:['kabuk'], q:['logo','görsel tasarım','kaplama'], reqs:[
   ['Logo alanları: iki kapı ve ön, 30×30 cm','B2 9.23.c','A','Kabuk tasarımında iki kapıda ve önde 30×30 cm boş alan bırak; logolar kayıtta veriliyor. Eksikse diskalifiye.'],
   ['Yarış numarası alanları, 20×25 cm','B2 9.23.d-e','A','İki kapıda ve önde 20×25 cm numara alanı, ön sağ kapıda ayrıca teknik kontrol plakası alanı bırak.'],
   ['Görsel Tasarım Ödülü raporu (≤ 20 sayfa, PDF)','B4 2.f-g','R','Farklı açılardan yüksek çözünürlüklü fotoğraflar, eskizler, CAD, tasarım konsepti ve üretilebilirlik bölümüyle en fazla 20 sayfalık PDF hazırla.'] ]},
 { id:'ttr', name:'Teknik Tasarım Raporu', birim:'O', ets:[], parts:[], deps:[], q:['teknik tasarım raporu','TTR','rapor'], reqs:[
   ['Takım bilgisi (100 puan)','B1 2.4','R','Başvuru ID, takım ve araç adı, iletişim sorumlusu ve üye tablosunu doldur.'],
   ['Araç özellikleri tablosu (100 puan)','B1 2.4','R','TTR şablonundaki araç özellikleri tablosunu güncel ölçülerle doldur.'],
   ['Rapor düzeni Bölüm_6\'ya uygun (200 puan)','B1 2.4; B6','R','Bölüm_6 Rapor Yazım Kılavuzu\'ndaki yazı tipi, numaralandırma, şekil ve tablo kurallarını uygula. Uymayan rapordan puan kırılır.'],
   ['Maliyet hesabı','B3 12','R','Parça ve hizmet maliyetlerini faturalarla tablo halinde topla.'],
   ['Analiz dosyaları ilgili bölümde link olarak','B1 2.3.m','R','Her analiz dosyasını Drive\'a koy ve ilgili bölüme link olarak ekle; görseller harici linkle değil rapor içinde olmalı.'] ]},
 { id:'video', name:'Videolar', birim:'O', ets:[], parts:[], deps:[], q:['video','test videosu'], reqs:[
   ['Alt Sistem Kontrol Videosu, ≤ 7 dk, kesintisiz','B2 10.1','A','Kaptan kendini, takımı ve güncel bir Bilim ve Teknik dergisini göstererek başlar; mimari şema, güç aktarımı, batarya+BMS, şasi ve yazılım anlatılır. Kesme ve hızlandırma yasak; YouTube\'a yüklenir.'],
   ['Dinamik Sürüş Testi Videosu, ≤ 2 dk','B2 11.1','A','25 m düz alanda 8 m arayla 3 engel; slalom, A–B arası geri sürüş, slalomla dönüş. Engellere değmeden, durmadan.'],
   ['Fren Testi Videosu, ≤ 2 dk, ≥ 10° eğim','B2 11.2','A','Eğimi iki noktadan telefonla ölçerek göster; araç tepeden inerken frenle, 4 sn tut, bırak; iki kez tekrarla.'],
   ['Teknik Onay Videosu, ≤ 10 dk, Tablo 2 eksiksiz','B2 11.3','A','Araç etrafında 360° tur, sonra Tablo 2\'deki araç dışı ve araç içi her maddeyi çalışır halde göster. Bir madde eksikse aşama başarısız.'] ]},
];

// 2026 yarış haftasında araca yapıştırılan teknik kontrol plakası (takımın çektiği fotoğraftan):
// 11 turuncu başlık 5 / 4 / 2 dizilir, hepsi geçilince yeşil "Teknik kontrol başarılı" etiketi yapıştırılır.
// Bölüm 7 İkinci Gün (e) daha uzun bir liste sayar (hidrojen, EYS dahil); plakada bunlar yok.
// Hangi kalemin hangi başlığa girdiği şartnamede tek tek yazmıyor: eşleştirme takımın tahminidir.
const ETIKETLER = [
  { id:'dinamik',   n:'Dinamik Sürüş ve Fren Testi', ic:'car',    src:'B7 G2.e-h; B2 11.1; B2 11.2' },
  { id:'mekanik',   n:'Mekanik',                     ic:'buggy',  src:'B2 8; B2 9.8; B2 9.9; B2 9.14' },
  { id:'tasit',     n:'Taşıt Güvenliği',             ic:'shield', src:'B2 9.5; B2 9.6; B2 9.7; B2 9.17; B2 9.19; B2 9.22' },
  { id:'motor',     n:'Motor',                       ic:'motor',  src:'B3 3' },
  { id:'surucu',    n:'Motor Sürücüsü',              ic:'driver', src:'B3 4' },
  { id:'izolasyon', n:'İzolasyon İzleme Cihazı',     ic:'pulse',  src:'B3 10' },
  { id:'bys',       n:'Batarya Yönetim Sistemi',     ic:'chip',   src:'B3 6; B2 9.2.i' },
  { id:'batarya',   n:'Batarya Paketleme',           ic:'cells',  src:'B3 7; B2 9.1; B2 9.2' },
  { id:'ysb',       n:'Yerleşik Şarj Birimi',        ic:'plug',   src:'B3 8' },
  { id:'aks',       n:'AKS ve Telemetri',            ic:'signal', src:'B3 9; B2 7' },
  { id:'elektrik',  n:'Elektriksel Güvenlik',        ic:'bolt',   src:'B2 4; B2 3' },
];
const PLATE_ROWS = [5,4,2];

// Bölüm 2 Ek 1 Ceza Listesi: her satırın "BAŞLIK" sütunu → sorumlu kalem.
const CEZA_KALEM = {
  'Dinamik Sürüş Testi Videosu':'video','Fren Testi Videosu':'video','Alt Sistem Kontrol Videosu':'video','Teknik Onay Videosu':'video',
  'Teknik Tasarım Raporu':'ttr','Dinamik Sürüş Testi':'surus','Araç Kamerası':'telemetri',
  'Araç ölçüleri':'kabuk','Araç gövdesi':'kabuk','Araç kapıları ve mekanizmaları':'kapi','Aracın ön camı':'kapi','Aracın ön cam sileceği':'kapi',
  'Araç dikiz aynaları':'aydinlatma','Araç stop lambası':'aydinlatma','Aracın ön farları':'aydinlatma','Korna':'aydinlatma',
  'Araç çekme halkası':'sasi','Aracın lastiği':'fren','Aracın lastik basıncı':'fren',
  'EA Bayrak/Logo':'logo','Yarış numarası plakası':'logo','Teknik kontrol plakası':'logo',
  'Kokpit':'koltuk','Emniyet kemeri':'koltuk','Koltuk':'koltuk','Roll barlar':'rollcage','Roll cage':'rollcage',
  'Yangın söndürücü':'surus','Pilot kıyafeti ve donanımı':'surus','Acil tahliye (sürücü ve yedek sürücü)':'surus',
  'Direksiyon':'direksiyon','Fren':'fren','Fren testi':'fren','Fren sistemi':'fren','Hız göstergesi':'telemetri','Ayak hız pedalı':'aks',
  'Elektrik kablo bağlantıları':'elguv','Acil durdurma düğmesi':'elguv','Aşırı akım devre kesici':'elguv','Elektriksel Güvenlik':'elguv',
  'Batarya':'batarya','Batarya kutusu':'batarya','Batarya kutusu sabitleme':'batarya','Güvenlik perdesi':'batarya','Enerji':'batarya',
  'Batarya yönetim sistemi':'bms','Batarya sıcaklık ölçümü':'bms','Telemetri':'telemetri','İzolasyon izleme cihazı':'izolasyon',
  'Motor Sürücüsü':'surucu','Yerleşik Şarj Birimi':'ysb',
};
// Ceza satırının kalemi; yerden yükseklik şasinin işi.
const cezaKalem = c => /yerden yüksekli/i.test(c.i) ? 'sasi' : (CEZA_KALEM[c.b] || null);
