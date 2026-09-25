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
  /** When this option is picked, a text box opens for the applicant to say more. */
  digerSecenegi?: string;
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
      id: "bolum",
      tip: "kisa_metin",
      soru: "Bölümün",
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
      secenekler: [
        "Kampüsteki afiş/stant",
        "Arkadaş tavsiyesi",
        "Sosyal medya",
        "WhatsApp grupları",
        "Ders/hoca",
        "Diğer",
      ],
      digerSecenegi: "Diğer",
      zorunlu: false,
    },
    {
      id: "neden_katilmak_istiyorsun",
      tip: "uzun_metin",
      soru: "Voltaris'e neden katılmak istiyorsun? Bizi en çok bu cevap ilgilendiriyor, uzun ve mükemmel olmak zorunda değil.",
      zorunlu: true,
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
      ozelSorular: [],
    },
    elektrik: {
      baslik: "Voltaris Elektronik Komitesi Başvuru Formu",
      aciklama:
        "Elektronik komitesi aracın 'beynini' oluşturuyor: batarya yönetim sistemi, motor sürücü, araç kontrol sistemi ve sürüş destek yazılımları. Şu an en büyük ihtiyacımız Batarya Yönetim Sistemi (BYS) ve Motor Sürücü tarafında — bu alanlarda henüz gerçek bir devre kartımız yok. Temel bir devre/programlama dersi görmüş olmak avantaj ama şart değil; öğrenmeye açık olmak en önemlisi.",
      ozelSorular: [],
    },
    destek: {
      baslik: "Voltaris Diğer Komiteler Başvuru Formu (Ar-Ge & Doküman / Sponsorluk / Sosyal Medya)",
      aciklama:
        "Bu komiteler teknik olmasa da takımı ayakta tutan işleri yürütüyor: rapor yazımı ve rakip takım araştırması, sponsor ilişkileri ve bütçe takibi, sosyal medya ve içerik üretimi. Şu an elimizde derlenmiş bir teknik rapor yok, bu yüzden Ar-Ge & Doküman tarafına özellikle ihtiyacımız var.",
      ozelSorular: [],
    },
  },
};

export const applicationFormsEn: ApplicationFormsData = {
  ortakSorular: [
    { id: "ad_soyad", tip: "kisa_metin", soru: "Full name", zorunlu: true },
    { id: "eposta", tip: "eposta", soru: "Your email address", zorunlu: true },
    { id: "telefon", tip: "telefon", soru: "Your phone number", zorunlu: true },
    {
      id: "bolum",
      tip: "kisa_metin",
      soru: "Your department",
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
      secenekler: [
        "Campus poster/booth",
        "Friend's recommendation",
        "Social media",
        "WhatsApp groups",
        "A course/instructor",
        "Other",
      ],
      digerSecenegi: "Other",
      zorunlu: false,
    },
    {
      id: "neden_katilmak_istiyorsun",
      tip: "uzun_metin",
      soru:
        "Why do you want to join Voltaris? This is the answer we care about most — it doesn't have to be long or perfect.",
      zorunlu: true,
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
      ozelSorular: [],
    },
    elektrik: {
      baslik: "Voltaris Electronics Committee Application Form",
      aciklama:
        "The Electronics committee is the vehicle's 'brain': the battery management system, motor driver, vehicle control system, and driver-assistance software. Our biggest need right now is on the Battery Management System (BMS) and Motor Driver side — we don't have a real circuit board for either yet. Having taken a basic circuits/programming course is a plus but not required; being open to learning matters most.",
      ozelSorular: [],
    },
    destek: {
      baslik: "Voltaris Other Committees Application Form (R&D & Documentation / Sponsorship / Social Media)",
      aciklama:
        "These committees aren't technical, but they keep the team running: report writing and competitor research, sponsor relations and budget tracking, social media and content creation. We don't currently have a compiled technical report, so we especially need help on the R&D & Documentation side.",
      ozelSorular: [],
    },
  },
};

export function getApplicationForms(lang: "tr" | "en"): ApplicationFormsData {
  return lang === "en" ? applicationFormsEn : applicationFormsTr;
}
