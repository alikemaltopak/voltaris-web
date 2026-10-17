// Teknik Tasarım Raporu şablonundaki tablolar (2026_TTR_Rapor_Şablonu, Bölüm 3 ile aynı içerik). Tablo numaraları şablondaki gibi.
// Her satır: [etiket, birim/ipucu, sorumlu kalem, alan anahtarı, seçenek: {son:true} araç bitince ölçülebilir, {opts:[..]} seçimli]
// Aynı alan iki tabloda geçiyorsa (ör. motor gücü) aynı kalem+anahtar kullanılır, bir kez doldurulur.
const EH = ['Evet','Hayır'];
const RAPOR_TABLES = [
 { id:'takim', n:'Tablo 1. Takım bilgi tablosu', src:'TTR 1', rows:[
   ['Başvuru ID','','ttr','basvuruId'], ['Takım ID','','ttr','takimId'], ['Takım adı','','ttr','takimAdi'], ['Araç adı','','ttr','aracAdi'],
   ['İletişim sorumlusunun adı soyadı','','ttr','iletisim'], ['Bağlı olduğu kurum','','ttr','kurum'], ['Takım üye sayısı','kişi','ttr','uyeSayisi'],
   ['Kategori','','ttr','kategori',{opts:['Elektromobil','Hidromobil']}], ['Araç durumu','','ttr','aracDurumu',{opts:['Yeni araç','Mevcut araç']}] ]},
 { id:'ozellik', n:'Tablo 2. Araç özellikleri tablosu', src:'TTR 2', rows:[
   ['Uzunluk','mm','kabuk','uzunluk'], ['Genişlik','mm','kabuk','genislik'], ['Yükseklik','mm','kabuk','yukseklik'],
   ['Şasi','malzeme türü','sasi','malzeme'], ['Kabuk','malzeme türü','kabuk','malzeme'],
   ['Fren sistemi','hidrolik disk, ön, arka, el freni','fren','sistem'],
   ['Motor','türü','motor','tip'], ['Motor gücü','kW','motor','guc'], ['Motor verimliliği','%','motor','verim'], ['Elektrik makinesi ağırlığı','kg','motor','agirlik'],
   ['Batarya','türü','batarya','tip'], ['Batarya paketi nominal gerilimi','V','batarya','nomV'], ['Batarya paketi kapasitesi','Ah','batarya','ah'],
   ['Batarya paketi maksimum gerilimi','V','batarya','maxV'], ['Batarya paketi enerjisi','Wh','batarya','wh'],
   ['Lastik ebatı','16 inç veya 17 inç','fren','lastik',{opts:['16 inç','17 inç']}], ['2025 yılında lastik alma durumu','alındı / alınmadı','fren','lastikAlim',{opts:['Alındı','Alınmadı']}],
   ['2025 yılında kemer alma durumu','alındı / alınmadı','koltuk','kemerAlim',{opts:['Alındı','Alınmadı']}] ]},
 { id:'mekanik', n:'Mekanik ölçüler (şablonda tablo değil; 11. bölüm ve teknik kontrol için)', src:'TTR 11; B2 8.1', rows:[
   ['Dingil mesafesi','mm (en az 1300)','sasi','dingil'], ['Ön iz genişliği','mm (en az 1000)','sasi','onIz'], ['Arka iz genişliği','mm (en az 800)','sasi','arkaIz'],
   ['Yerden yükseklik (sürücü içindeyken)','mm (en az 100)','sasi','yerden',{son:true}], ['Araç ağırlığı (sürücüsüz)','kg (en fazla 350)','sasi','agirlik',{son:true}],
   ['Roll bar boru ölçüsü','çap × et kalınlığı, mm','rollcage','boru'], ['Roll bar malzemesi','çelik türü, akma dayanımı MPa','rollcage','malzeme'],
   ['1 kN yükte yatay yer değiştirme (ön / arka)','mm, H/200 sınırı','rollcage','deplasman'],
   ['Simit boşluğu','derece (en fazla 7)','direksiyon','bosluk'], ['Dönüş yarıçapı','m','direksiyon','donus'],
   ['Koltuklar arası mesafe','mm (en az 90)','koltuk','ara'], ['Sürücü koltuğu sırt açısı','derece (en fazla 30)','koltuk','aci'],
   ['Kapı açıklığı','genişlik × yükseklik, cm','kapi','olcu'] ]},
 { id:'motor', n:'Tablo 3. Motor özellikleri', src:'TTR 3', rows:[
   ['Motor tipi','','motor','tip'], ['Motor faz gerilimi','V','motor','fazV'], ['Motor gücü','kW','motor','guc'], ['Motor hızı','rpm','motor','hiz'],
   ['Motor ağırlığı','kg','motor','agirlik'], ['Motor verimi','%','motor','verim'], ['Sargı şeması','','motor','sargi'], ['Motor test yöntemi ve sonuçları','','motor','test'] ]},
 { id:'surucu', n:'Tablo 4. Motor sürücüsü özellikleri', src:'TTR 4', rows:[
   ['Üretici parça numarası','','surucu','parcaNo'], ['Akım değeri','A','surucu','akim'], ['Gerilim değeri','V','surucu','gerilim'], ['Çalışma frekansı','kHz','surucu','frekans'],
   ['Akım limit değeri','A','surucu','limit'], ['Sürücü / kontrol yöntemi','','surucu','yontem'], ['Ağırlık','kg','surucu','agirlik'], ['Boyut','U × G × Y, mm','surucu','boyut'],
   ['Verim','%','surucu','verim'], ['Çalışma sıcaklığı aralığı','°C','surucu','sicaklik'],
   ['Programlanabilme özelliği','','surucu','prog',{opts:EH}], ['Rejeneratif frenleme modu','','surucu','rejen',{opts:EH}], ['Aşırı gerilim koruması','','surucu','kAsiriV',{opts:EH}],
   ['Düşük gerilim koruması','','surucu','kDusukV',{opts:EH}], ['Aşırı akım koruması','','surucu','kAkim',{opts:EH}], ['Aşırı ısınma koruması','','surucu','kIsi',{opts:EH}],
   ['HALL koruması','','surucu','kHall',{opts:EH}], ['Faz sargısı bağlantı kesme koruması','','surucu','kFaz',{opts:EH}] ]},
 { id:'bys', n:'Tablo 5. BYS özellikleri', src:'TTR 6', rows:[
   ['Seri ve paralel hücre sayısı','ör. 36S2P','bms','sp'], ['Çıkış gerilimi','V','bms','cikisV'], ['Çıkış akımı','A','bms','cikisA'],
   ['Dengeleme yöntemi','aktif / pasif','bms','dengeleme',{opts:['Aktif','Pasif']}], ['BYS devre tipi','merkezi, modüler…','bms','devre'],
   ['SoC tahmin yöntemi','','bms','soc'], ['BYS entegresi ürün kodu','','bms','entegre'] ]},
 { id:'paket', n:'Tablo 6. Batarya paketleme yapısının özellikleri', src:'TTR 7', rows:[
   ['Hücre kimyası','LiNiMnCo, LiFePO4, Li4Ti5O12…','batarya','kimya'], ['Hücre nominal gerilimi','V','batarya','hV'], ['Hücre kapasitesi','Ah','batarya','hAh'],
   ['Hücre ağırlığı','g','batarya','hG'], ['Hücre kapasite yoğunluğu','Ah/g','batarya','hAhG'], ['Hücre enerji yoğunluğu','Wh/kg','batarya','hWhKg'],
   ['Batarya paketi kapasitesi','Ah','batarya','ah'], ['Batarya paketi nominal gerilimi','V','batarya','nomV'], ['Batarya paketinin toplam ağırlığı','kg','batarya','kg'],
   ['Batarya paketi boyutları','U, G, Y, mm','batarya','boyut'], ['Batarya paketi toplam hacmi','m³','batarya','hacim'], ['Batarya paketi toplam enerjisi','Wh','batarya','wh'],
   ['Enerji yoğunluğu (kütle)','Wh/kg','batarya','eyK'], ['Güç yoğunluğu (kütle)','W/kg','batarya','gyK'], ['Enerji yoğunluğu (hacim)','Wh/m³','batarya','eyH'], ['Güç yoğunluğu (hacim)','W/m³','batarya','gyH'],
   ['Batarya kabı malzemesi','','batarya','kap'], ['İzolasyon malzemeleri','','batarya','izo'], ['Soğutma yöntemi','hava, sıvı','batarya','sogutma'],
   ['Güvenlik perdesi','malzeme','batarya','perde'], ['Paketin araç içindeki konumu','','batarya','konum'], ['Yerli mi','','batarya','yerli',{opts:EH}] ]},
 { id:'ysb', n:'Tablo 7. Yerleşik şarj birimi özellikleri', src:'TTR 8', rows:[
   ['Devre topolojisi','','ysb','topoloji'], ['Güç seviyesi','W (en az 500)','ysb','guc'], ['Çıkış gerilim aralığı','V','ysb','cikisV'], ['Çıkış akım salınımı','A','ysb','salinim'],
   ['Giriş güç faktörü','','ysb','pf'], ['Güç çevrim verimi','%','ysb','verim'], ['Kontrolör','','ysb','kontrolor'], ['Şarj yöntemi','ör. CC-CV','ysb','yontem'], ['Koruma devreleri / elemanları','','ysb','koruma'] ]},
 { id:'aks', n:"Tablo 8. AKS'nin özellikleri", src:'TTR 9.1.2', rows:[
   ['AKS fonksiyonları','','aks','fonk'], ['Kontrolör entegre devresi','','aks','entegre'], ['AKS giriş / çıkış sayısı','','aks','io'],
   ['Elektronik devre tasarımı','kendi / hazır, kısa açıklama','aks','devre'], ['Baskı devre kartı tasarımı','','aks','pcbTas'], ['Baskı devre kartı üretimi','','aks','pcbUre'],
   ['Yazılım algoritması','kısa açıklama','aks','algo'], ['Deneysel çalışma','yapılan testler, sonuçlar','aks','deney'], ['Boyut (PCB / kutu)','mm','aks','boyut'] ]},
 { id:'izo', n:'Tablo 9. İzolasyon izleme cihazının özellikleri', src:'TTR 10', rows:[
   ['50 kΩ için ölçüm hassasiyeti','','izolasyon','h50k'], ['200 kΩ için ölçüm hassasiyeti','','izolasyon','h200k'], ['1 MΩ için ölçüm hassasiyeti','','izolasyon','h1M'],
   ['AKS ile haberleşme izole şekilde mi?','','izolasyon','izoleHab',{opts:EH}], ['İzolasyon bozulunca nasıl uyarı veriyor?','','izolasyon','uyari'],
   ['Sürüşte izolasyon bozulursa sürücü için önlem','','izolasyon','onlem'] ]},
];
// Teknik kontrol için araç tamamlanınca bakılabilecek şartname maddeleri (kalemin reqs sırası).
const REQ_SON = { sasi:[2,4], rollcage:[3], fren:[3], koltuk:[6], motor:[2], batarya:[5], ysb:[3], aks:[1], surus:[4], video:[1,2,3] };

// Şablonun metin bölümleri: tablo değil, yazı. Ekip bulduklarını ve taslağı buraya not eder, destek ekibi rapora çevirir.
const RAPOR_SECTIONS = [
 ['3.1','Motor için beklentiler / isterler','motor'], ['4','Motor sürücü','surucu'], ['5','Batarya','batarya'], ['6','Batarya yönetim sistemi','bms'],
 ['7.1-7.9','Batarya paketlenmesi (hücre, paket, malzeme, ısıl analiz, yerleşim, soğutma, kutu, erişim, preşarj)','batarya'],
 ['8','Yerleşik şarj birimi','ysb'], ['9.1.1','AKS ana fonksiyonları','aks'], ['9.1.2','Yazılım algoritması','aks'], ['9.2','Telemetri sistemi','telemetri'],
 ['10','İzolasyon izleme cihazı','izolasyon'], ['11.1','Araç ölçüleri (teknik resim)','kabuk'], ['11.2','Araç gövdesi ve şasi','sasi'], ['11.3','Roll bar ve roll cage','rollcage'],
 ['11.4','Yolcu koltuğu','koltuk'], ['11.5','Direksiyon sistemi','direksiyon'], ['11.6','Kapı mekanizması','kapi'], ['11.7','Fren sistemi','fren'],
 ['12','Maliyet hesabı','ttr'], ['17','Araç elektrik şeması','elguv'],
];
const KAYNAK = ['Ölçüldü','Datasheet','Hesap / analiz','Tahmin'];
