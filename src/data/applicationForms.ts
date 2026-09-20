export type QuestionType =
  | "kisa_metin"
  | "eposta"
  | "telefon"
  | "tekli_secim"
  | "coklu_secim"
  | "coklu_secim_siralamali"
  | "olcek_1_5"
  | "uzun_metin"
  | "dosya";

export type Question = {
  id: string;
  tip: QuestionType;
  soru: string;
  yardimciMetin?: string;
  secenekler?: string[];
  zorunlu: boolean;
};

export type CommitteeForm = {
  baslik: string;
  aciklama: string;
  ozelSorular: Question[];
};

export type CommitteeId = "mekanik" | "elektrik" | "destek";

export type ApplicationFormsData = {
  ortakSorular: Question[];
  formlar: Record<CommitteeId, CommitteeForm>;
};

// Source: Voltaris takımının paylaştığı "voltaris-basvuru-formlari.json" dosyası.
// "elektronik" -> "elektrik", "diger" -> "destek" (sitedeki komite id'leriyle eşleştirildi).
export const applicationFormsTr: ApplicationFormsData = {
  ortakSorular: [
    { id: "ad_soyad", tip: "kisa_metin", soru: "Ad Soyad", zorunlu: true },
    { id: "eposta", tip: "eposta", soru: "E-posta adresin", zorunlu: true },
    { id: "telefon", tip: "telefon", soru: "Telefon numaran", zorunlu: true },
    {
      id: "universite_bolum",
      tip: "kisa_metin",
      soru: "Üniversite ve bölüm",
      yardimciMetin: "Örn: İYTE, Makine Mühendisliği",
      zorunlu: true,
    },
    {
      id: "sinif",
      tip: "tekli_secim",
      soru: "Kaçıncı sınıftasın?",
      secenekler: ["Hazırlık", "1. Sınıf", "2. Sınıf", "3. Sınıf", "4. Sınıf", "Yüksek Lisans/Doktora"],
      zorunlu: true,
    },
    {
      id: "nasil_duydun",
      tip: "tekli_secim",
      soru: "Voltaris'i nereden duydun?",
      secenekler: ["Kampüsteki afiş/stant", "Arkadaş tavsiyesi", "Sosyal medya", "Ders/hoca", "Diğer"],
      zorunlu: false,
    },
    {
      id: "haftalik_zaman",
      tip: "tekli_secim",
      soru: "Haftada ortalama kaç saat ayırabilirsin?",
      secenekler: ["1-3 saat", "4-6 saat", "7-10 saat", "10 saatten fazla"],
      zorunlu: true,
    },
    {
      id: "neden_katilmak_istiyorsun",
      tip: "uzun_metin",
      soru: "Voltaris'e neden katılmak istiyorsun? Bizi en çok bu cevap ilgilendiriyor, uzun ve mükemmel olmak zorunda değil.",
      zorunlu: true,
    },
    {
      id: "daha_once_ne_yaptin",
      tip: "uzun_metin",
      soru:
        "Daha önce elinle/kodla/tasarımla bir şeyler denediğin oldu mu? Ders projesi, hobi, bir şeyi söküp bir şey yapmaya çalışmak da sayılır — deneyim şart değil, merakını gösteren her şey olur.",
      zorunlu: false,
    },
    {
      id: "cv_on_yazi",
      tip: "dosya",
      soru: "Ön yazın veya özgeçmişin",
      yardimciMetin: "Hazır bir CV'n yoksa boş bırakabilirsin, bu alan zorunlu değil.",
      zorunlu: false,
    },
    {
      id: "ekleyecek_bir_seyin_var_mi",
      tip: "uzun_metin",
      soru: "Eklemek istediğin bir şey var mı? (Portfolyo, GitHub, çizim, video linki vb. de buraya bırakabilirsin)",
      zorunlu: false,
    },
  ],
  formlar: {
    mekanik: {
      baslik: "Voltaris Mekanik Komitesi Başvuru Formu",
      aciklama:
        "Mekanik komitesi aracın fiziksel iskeletinden dış kabuğuna kadar her şeyi tasarlayıp üretiyor. Şu an aracımız şase üzerinde, kabuğu henüz takılmadı — bu yüzden özellikle kabuk tasarım ve üretimine ihtiyacımız var. Deneyimin olmasa da CAD öğrenmeye veya atölyede elini taşın altına koymaya açıksan başvurabilirsin; öncelik meraktır, tecrübe bonus'tur.",
      ozelSorular: [
        {
          id: "alt_takim_tercihi",
          tip: "coklu_secim_siralamali",
          soru:
            "Aşağıdaki alt çalışma alanlarından hangilerine ilgi duyuyorsun? (Birden fazla seçebilirsin, ilk seçtiğin en çok istediğin olsun)",
          secenekler: [
            "Kabuk Tasarımı (aerodinamik, yüzey modelleme, kompozit parça planlama)",
            "Kabuk Üretimi (kalıp çıkarma, kompozit/fiberglas-karbon işçiliği)",
            "Fren - Direksiyon - Süspansiyon (CAD tasarım ve üretim/montaj)",
            "Şasi ve Roll Cage (kaynak, metal işleme, üretim)",
            "Batarya Paketleme (hücre yerleşimi, termal tasarım)",
          ],
          zorunlu: true,
        },
        {
          id: "cad_beceri",
          tip: "olcek_1_5",
          soru: "CAD (SolidWorks, Fusion 360, AutoCAD vb.) becerini 1-5 arası değerlendir",
          yardimciMetin:
            "1 = hiç kullanmadım, 5 = aktif ve rahat kullanıyorum. Bu soru eleme için değil, hangi göreve daha uygun olduğunu anlamamız için.",
          zorunlu: true,
        },
        {
          id: "atolye_deneyimi",
          tip: "tekli_secim",
          soru: "Kaynak, kesim, kompozit/kalıp işi gibi atölye tipi işlere yatkın mısın ya da denemek ister misin?",
          secenekler: [
            "Evet, daha önce yaptım",
            "Yapmadım ama denemek isterim",
            "Bu benim tarzım değil, daha çok tasarım/CAD tarafında olmak isterim",
          ],
          zorunlu: true,
        },
        {
          id: "detay_ve_sabir",
          tip: "uzun_metin",
          soru:
            "Süspansiyon ve fren tasarımı çok sayıda revizyon ve ince detay gerektiriyor. Tekrar tekrar düzeltme yapman gereken bir işte sabrını nasıl korursun, kısaca anlatır mısın?",
          zorunlu: false,
        },
      ],
    },
    elektrik: {
      baslik: "Voltaris Elektronik Komitesi Başvuru Formu",
      aciklama:
        "Elektronik komitesi aracın 'beynini' oluşturuyor: batarya yönetim sistemi, motor sürücü, araç kontrol sistemi ve sürüş destek yazılımları. Şu an en büyük ihtiyacımız Batarya Yönetim Sistemi (BYS) ve Motor Sürücü tarafında — bu alanlarda henüz gerçek bir devre kartımız yok. Temel bir devre/programlama dersi görmüş olmak avantaj ama şart değil; öğrenmeye açık olmak en önemlisi.",
      ozelSorular: [
        {
          id: "alt_takim_tercihi",
          tip: "coklu_secim_siralamali",
          soru:
            "Aşağıdaki alt çalışma alanlarından hangilerine ilgi duyuyorsun? (Birden fazla seçebilirsin, ilk seçtiğin en çok istediğin olsun)",
          secenekler: [
            "Batarya Yönetim Sistemi / BYS (devre tasarımı, hücre dengeleme, SOC algoritması)",
            "Motor Sürücü / Güç Elektroniği (MOSFET, gate driver, PCB)",
            "AKS - Araç Kontrol Sistemi (STM32/ESP32, telemetri, gerçek sensör entegrasyonu)",
            "ADAS / Gömülü Yazılım (görüntü işleme, Python, yapay zeka)",
            "Araç Elektrik Şeması (aracın komple kablo/devre şemasını çıkarma)",
          ],
          zorunlu: true,
        },
        {
          id: "python_cpp_beceri",
          tip: "olcek_1_5",
          soru: "Python/C++ becerini 1-5 arası değerlendir",
          yardimciMetin:
            "1 = hiç yazmadım, 5 = aktif ve rahat kod yazıyorum. Bu soru eleme için değil, hangi göreve daha uygun olduğunu anlamamız için.",
          zorunlu: true,
        },
        {
          id: "elektronik_devre_beceri",
          tip: "olcek_1_5",
          soru: "Elektronik devre becerini 1-5 arası değerlendir",
          yardimciMetin: "1 = hiç bilmiyorum, 5 = devre okuyup kurabiliyorum (Arduino/ESP32/breadboard vb.).",
          zorunlu: true,
        },
        {
          id: "gomulu_stm32_beceri",
          tip: "olcek_1_5",
          soru: "Gömülü sistem (STM32 vb.) becerini 1-5 arası değerlendir",
          zorunlu: false,
        },
        {
          id: "goruntu_isleme_beceri",
          tip: "olcek_1_5",
          soru: "Görüntü işleme (OpenCV/YOLO) becerini 1-5 arası değerlendir",
          zorunlu: false,
        },
        {
          id: "matlab_simulink_beceri",
          tip: "olcek_1_5",
          soru: "MATLAB/Simulink becerini 1-5 arası değerlendir",
          zorunlu: false,
        },
        {
          id: "ilgili_dersler",
          tip: "coklu_secim",
          soru: "Aldığın veya almayı planladığın derslerden hangileri var? (varsa)",
          secenekler: [
            "Devre Teorisi / Güç Elektroniği",
            "Kontrol Sistemleri",
            "Gömülü Sistemler / Mikroişlemciler",
            "Sinyal İşleme / Görüntü İşleme",
            "Hiçbiri, henüz almadım",
          ],
          zorunlu: false,
        },
      ],
    },
    destek: {
      baslik: "Voltaris Diğer Komiteler Başvuru Formu (Ar-Ge & Doküman / Sponsorluk / Sosyal Medya)",
      aciklama:
        "Bu komiteler teknik olmasa da takımı ayakta tutan işleri yürütüyor: rapor yazımı ve rakip takım araştırması, sponsor ilişkileri ve bütçe takibi, sosyal medya ve içerik üretimi. Şu an elimizde derlenmiş bir teknik rapor yok, bu yüzden Ar-Ge & Doküman tarafına özellikle ihtiyacımız var.",
      ozelSorular: [
        {
          id: "alt_takim_tercihi",
          tip: "coklu_secim_siralamali",
          soru:
            "Aşağıdaki alt çalışma alanlarından hangilerine ilgi duyuyorsun? (Birden fazla seçebilirsin, ilk seçtiğin en çok istediğin olsun)",
          secenekler: [
            "Ar-Ge ve Doküman (teknik rapor yazımı, rakip takım/literatür araştırması, yarışma şartname takibi)",
            "Sponsorluk (sponsor iletişimi, sunum hazırlama, bütçe/malzeme takibi)",
            "Sosyal Medya (video kurgu, fotoğraf, içerik üretimi)",
          ],
          zorunlu: true,
        },
        {
          id: "yazma_deneyimi",
          tip: "tekli_secim",
          soru: "Rapor/metin yazma ve düzenli çalışma konusunda kendini nasıl tanımlarsın?",
          secenekler: [
            "Yazmayı severim, uzun metinleri toparlamakta iyiyimdir",
            "Fena değilim ama pratik yaparak gelişmek isterim",
            "Bu benim güçlü yanım değil, daha çok görsel/iletişim tarafında olmak isterim",
          ],
          zorunlu: true,
        },
        {
          id: "ingilizce_seviyesi",
          tip: "tekli_secim",
          soru:
            "Teknik İngilizce metin okuma seviyeni nasıl değerlendirirsin? (Uluslararası şartname ve referans makaleler için gerekiyor)",
          secenekler: ["İyi", "Orta", "Geliştirmem gerekiyor"],
          zorunlu: false,
        },
        {
          id: "iletisim_sunum_deneyimi",
          tip: "uzun_metin",
          soru:
            "Sponsorluk veya sosyal medya tercih ettiysen: daha önce bir sunum hazırladın mı, bir kuruma yazışma yaptın mı, video/fotoğraf içeriği ürettin mi? Kısaca anlat (deneyimin yoksa boş bırakabilirsin).",
          zorunlu: false,
        },
      ],
    },
  },
};

export const applicationFormsEn: ApplicationFormsData = {
  ortakSorular: [
    { id: "ad_soyad", tip: "kisa_metin", soru: "Full name", zorunlu: true },
    { id: "eposta", tip: "eposta", soru: "Your email address", zorunlu: true },
    { id: "telefon", tip: "telefon", soru: "Your phone number", zorunlu: true },
    {
      id: "universite_bolum",
      tip: "kisa_metin",
      soru: "University and department",
      yardimciMetin: "e.g. IZTECH, Mechanical Engineering",
      zorunlu: true,
    },
    {
      id: "sinif",
      tip: "tekli_secim",
      soru: "What year are you in?",
      secenekler: ["Prep year", "1st year", "2nd year", "3rd year", "4th year", "Master's/PhD"],
      zorunlu: true,
    },
    {
      id: "nasil_duydun",
      tip: "tekli_secim",
      soru: "Where did you hear about Voltaris?",
      secenekler: ["Campus poster/booth", "Friend's recommendation", "Social media", "A course/instructor", "Other"],
      zorunlu: false,
    },
    {
      id: "haftalik_zaman",
      tip: "tekli_secim",
      soru: "How many hours per week can you spare on average?",
      secenekler: ["1-3 hours", "4-6 hours", "7-10 hours", "More than 10 hours"],
      zorunlu: true,
    },
    {
      id: "neden_katilmak_istiyorsun",
      tip: "uzun_metin",
      soru:
        "Why do you want to join Voltaris? This is the answer we care about most — it doesn't have to be long or perfect.",
      zorunlu: true,
    },
    {
      id: "daha_once_ne_yaptin",
      tip: "uzun_metin",
      soru:
        "Have you tried building/coding/designing something before? A course project, a hobby, taking something apart to see how it works also counts — experience isn't required, anything that shows curiosity is fine.",
      zorunlu: false,
    },
    {
      id: "cv_on_yazi",
      tip: "dosya",
      soru: "Your cover letter or resume",
      yardimciMetin: "If you don't have one ready, leave it blank; this field is optional.",
      zorunlu: false,
    },
    {
      id: "ekleyecek_bir_seyin_var_mi",
      tip: "uzun_metin",
      soru: "Anything else you'd like to add? (You can leave a portfolio, GitHub, sketch, or video link here too)",
      zorunlu: false,
    },
  ],
  formlar: {
    mekanik: {
      baslik: "Voltaris Mechanical Committee Application Form",
      aciklama:
        "The Mechanical committee designs and builds everything from the vehicle's physical frame to its outer shell. Our vehicle is currently on its chassis — the body shell hasn't been fitted yet — so we especially need help with shell design and manufacturing. No experience needed if you're open to learning CAD or getting hands-on in the workshop; curiosity comes first, experience is a bonus.",
      ozelSorular: [
        {
          id: "alt_takim_tercihi",
          tip: "coklu_secim_siralamali",
          soru:
            "Which of the following sub-areas are you interested in? (You can pick more than one — put the one you want most first)",
          secenekler: [
            "Shell Design (aerodynamics, surface modeling, composite panel planning)",
            "Shell Manufacturing (mold making, composite/fiberglass-carbon layup work)",
            "Brakes - Steering - Suspension (CAD design and manufacturing/assembly)",
            "Chassis and Roll Cage (welding, metalworking, manufacturing)",
            "Battery Packaging (cell layout, thermal design)",
          ],
          zorunlu: true,
        },
        {
          id: "cad_beceri",
          tip: "olcek_1_5",
          soru: "Rate your CAD skill (SolidWorks, Fusion 360, AutoCAD, etc.) from 1 to 5",
          yardimciMetin:
            "1 = never used it, 5 = I use it actively and comfortably. This isn't for elimination — it helps us match you to the right role.",
          zorunlu: true,
        },
        {
          id: "atolye_deneyimi",
          tip: "tekli_secim",
          soru:
            "Are you comfortable with (or willing to try) workshop-type work like welding, cutting, or composite/mold work?",
          secenekler: [
            "Yes, I've done this before",
            "Haven't, but I'd like to try",
            "Not really my thing, I'd rather stay on the design/CAD side",
          ],
          zorunlu: true,
        },
        {
          id: "detay_ve_sabir",
          tip: "uzun_metin",
          soru:
            "Suspension and brake design require a lot of revisions and fine detail. How do you keep your patience through a job that needs repeated fixing? Tell us briefly.",
          zorunlu: false,
        },
      ],
    },
    elektrik: {
      baslik: "Voltaris Electronics Committee Application Form",
      aciklama:
        "The Electronics committee is the vehicle's 'brain': the battery management system, motor driver, vehicle control system, and driver-assistance software. Our biggest need right now is on the Battery Management System (BMS) and Motor Driver side — we don't have a real circuit board for either yet. Having taken a basic circuits/programming course is a plus but not required; being open to learning matters most.",
      ozelSorular: [
        {
          id: "alt_takim_tercihi",
          tip: "coklu_secim_siralamali",
          soru:
            "Which of the following sub-areas are you interested in? (You can pick more than one — put the one you want most first)",
          secenekler: [
            "Battery Management System / BMS (circuit design, cell balancing, SOC algorithm)",
            "Motor Driver / Power Electronics (MOSFETs, gate drivers, PCB)",
            "VCU - Vehicle Control Unit (STM32/ESP32, telemetry, real sensor integration)",
            "ADAS / Embedded Software (image processing, Python, AI)",
            "Vehicle Electrical Schematic (mapping the car's full wiring/circuit diagram)",
          ],
          zorunlu: true,
        },
        {
          id: "python_cpp_beceri",
          tip: "olcek_1_5",
          soru: "Rate your Python/C++ skill from 1 to 5",
          yardimciMetin:
            "1 = never coded, 5 = I code actively and comfortably. This isn't for elimination — it helps us match you to the right role.",
          zorunlu: true,
        },
        {
          id: "elektronik_devre_beceri",
          tip: "olcek_1_5",
          soru: "Rate your electronics/circuit skill from 1 to 5",
          yardimciMetin: "1 = no knowledge, 5 = I can read and build circuits (Arduino/ESP32/breadboard, etc.).",
          zorunlu: true,
        },
        {
          id: "gomulu_stm32_beceri",
          tip: "olcek_1_5",
          soru: "Rate your embedded systems (STM32, etc.) skill from 1 to 5",
          zorunlu: false,
        },
        {
          id: "goruntu_isleme_beceri",
          tip: "olcek_1_5",
          soru: "Rate your image processing (OpenCV/YOLO) skill from 1 to 5",
          zorunlu: false,
        },
        {
          id: "matlab_simulink_beceri",
          tip: "olcek_1_5",
          soru: "Rate your MATLAB/Simulink skill from 1 to 5",
          zorunlu: false,
        },
        {
          id: "ilgili_dersler",
          tip: "coklu_secim",
          soru: "Which of these courses have you taken or plan to take? (if any)",
          secenekler: [
            "Circuit Theory / Power Electronics",
            "Control Systems",
            "Embedded Systems / Microprocessors",
            "Signal Processing / Image Processing",
            "None yet",
          ],
          zorunlu: false,
        },
      ],
    },
    destek: {
      baslik: "Voltaris Other Committees Application Form (R&D & Documentation / Sponsorship / Social Media)",
      aciklama:
        "These committees aren't technical, but they keep the team running: report writing and competitor research, sponsor relations and budget tracking, social media and content creation. We don't currently have a compiled technical report, so we especially need help on the R&D & Documentation side.",
      ozelSorular: [
        {
          id: "alt_takim_tercihi",
          tip: "coklu_secim_siralamali",
          soru:
            "Which of the following sub-areas are you interested in? (You can pick more than one — put the one you want most first)",
          secenekler: [
            "R&D & Documentation (technical report writing, competitor/literature research, tracking competition rules)",
            "Sponsorship (sponsor communication, presentation prep, budget/material tracking)",
            "Social Media (video editing, photography, content creation)",
          ],
          zorunlu: true,
        },
        {
          id: "yazma_deneyimi",
          tip: "tekli_secim",
          soru: "How would you describe yourself when it comes to report/text writing and staying organized?",
          secenekler: [
            "I enjoy writing, I'm good at pulling long texts together",
            "Not bad, but I'd like to improve with practice",
            "Not my strong side — I'd rather be on the visual/communications side",
          ],
          zorunlu: true,
        },
        {
          id: "ingilizce_seviyesi",
          tip: "tekli_secim",
          soru:
            "How would you rate your technical English reading level? (needed for international rulebooks and reference papers)",
          secenekler: ["Good", "Average", "Needs improvement"],
          zorunlu: false,
        },
        {
          id: "iletisim_sunum_deneyimi",
          tip: "uzun_metin",
          soru:
            "If you chose sponsorship or social media: have you prepared a presentation before, reached out to an organization, or produced video/photo content? Briefly describe (leave blank if no experience).",
          zorunlu: false,
        },
      ],
    },
  },
};

export function getApplicationForms(lang: "tr" | "en"): ApplicationFormsData {
  return lang === "en" ? applicationFormsEn : applicationFormsTr;
}
