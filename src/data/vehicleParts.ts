/**
 * What the hologram says about a part when it is pointed at. Keyed on the
 * start of the mesh names in voltaris-arac.glb, so "Tekerlek" covers all four
 * wheels and "Batarya" the cells and the box alike.
 *
 * The figures are the ones on the specs list (i18n `vehicle.specs`); a part
 * with nothing measured to say about it gets its role alone.
 */
export interface PartInfo {
  name: string;
  role: string;
  specs: [label: string, value: string][];
}

type Lang = "tr" | "en";

/**
 * Which part answers when the pointer crosses several. The x-ray shows the
 * inside through the skin, so the inside has to win: a pointer on the pack
 * seen through the bodywork means the pack. The shell and glass come last and
 * answer only where nothing else is behind them. The frame tubes are thin, so
 * they only take the pointer when it is actually on one.
 */
export const PART_ORDER = [
  "Far",
  "Stop",
  "Ayna",
  "Direksiyon",
  "Ekran",
  "Kokpit",
  "Koltuk",
  "Motor",
  "Batarya_Fan",
  "Batarya",
  "Tekerlek",
  "RollCage",
  "Sasi",
  "Cam",
  "Govde",
] as const;

export type PartKey = (typeof PART_ORDER)[number];

/** The part a mesh belongs to; the wireframe copies count as their source. */
export function partKeyOf(meshName: string): PartKey | null {
  const name = meshName.replace(/^Tel_/, "");
  return PART_ORDER.find((key) => name.startsWith(key)) ?? null;
}

const PARTS: Record<PartKey, Record<Lang, PartInfo>> = {
  Govde: {
    tr: {
      name: "Gövde Kabuğu",
      role: "Aracın dış kabuğu. Havayı gövde boyunca düzgünce akıtıp sürtünmeyi azaltır; sürücüyü rüzgâra ve dış etkilere karşı korur.",
      specs: [
        ["Uzunluk", "≈ 3,20 m"],
        ["Dingil mesafesi", "2.200 mm"],
      ],
    },
    en: {
      name: "Body Shell",
      role: "The car's outer skin. It keeps the air flowing cleanly along the body to cut drag, and shields the driver from wind and weather.",
      specs: [
        ["Length", "≈ 3.20 m"],
        ["Wheelbase", "2,200 mm"],
      ],
    },
  },
  Cam: {
    tr: { name: "Ön Cam", role: "Sürücünün yolu görmesini sağlar ve rüzgârı keser.", specs: [] },
    en: { name: "Windscreen", role: "Gives the driver a view of the road and keeps the wind off.", specs: [] },
  },
  Ayna: {
    tr: { name: "Yan Aynalar", role: "Arkadaki pisti ve araçları görmeyi sağlar.", specs: [] },
    en: { name: "Side Mirrors", role: "Let the driver see the track and traffic behind.", specs: [] },
  },
  Sasi: {
    tr: {
      name: "Şasi",
      role: "Aracın taşıyıcı iskeleti. Süspansiyon, batarya, koltuklar ve kabuk bu yapıya bağlanır.",
      specs: [
        ["Malzeme", "6061-T6 alüminyum profil"],
        ["Dingil mesafesi", "2.200 mm"],
        ["Boş ağırlık (araç)", "120 kg"],
      ],
    },
    en: {
      name: "Chassis",
      role: "The car's load-bearing frame. Suspension, battery, seats and bodywork all mount to it.",
      specs: [
        ["Material", "6061-T6 aluminium profile"],
        ["Wheelbase", "2,200 mm"],
        ["Kerb weight (car)", "120 kg"],
      ],
    },
  },
  RollCage: {
    tr: {
      name: "Roll Cage",
      role: "Araç devrilirse sürücünün başını ve gövdesini koruyan güvenlik kafesi.",
      specs: [],
    },
    en: {
      name: "Roll Cage",
      role: "The safety cage that protects the driver's head and body if the car rolls over.",
      specs: [],
    },
  },
  Tekerlek: {
    tr: {
      name: "Tekerlek ve Süspansiyon",
      role: "Aracı yere basan dört nokta. Süspansiyon yoldaki darbeleri emer, disk frenler aracı durdurur.",
      specs: [
        ["Jant", "16 inç"],
        ["Süspansiyon", "Çift salıncak · Mondial Drift L 125"],
        ["Fren", "Hidrolik disk · 50 km/sa'dan 14,05 m"],
      ],
    },
    en: {
      name: "Wheels & Suspension",
      role: "The four points the car stands on. The suspension soaks up the road, the disc brakes bring it to a stop.",
      specs: [
        ["Rim", "16 in"],
        ["Suspension", "Double wishbone · Mondial Drift L 125"],
        ["Brakes", "Hydraulic disc · 14.05 m from 50 km/h"],
      ],
    },
  },
  Motor: {
    tr: {
      name: "Hub Motor",
      role: "Tekerleğin göbeğine yerleşik elektrik motoru. Gücü doğrudan tekerleğe verir; zincir, kayış ya da şanzıman gerekmez.",
      specs: [
        ["Tip", "BLDC hub motor"],
        ["Gerilim", "48 V"],
        ["Güç", "1000 W"],
        ["Adet", "2"],
      ],
    },
    en: {
      name: "Hub Motor",
      role: "An electric motor built into the wheel hub. It drives the wheel directly, with no chain, belt or gearbox.",
      specs: [
        ["Type", "BLDC hub motor"],
        ["Voltage", "48 V"],
        ["Power", "1000 W"],
        ["Count", "2"],
      ],
    },
  },
  Batarya: {
    tr: {
      name: "Batarya Paketi",
      role: "Aracın enerji deposu. Motorları ve tüm elektronik sistemi besler.",
      specs: [
        ["Kimya", "Li-ion"],
        ["Gerilim", "48 V"],
        ["Enerji", "1.680 Wh"],
        ["Menzil", "80–100 km"],
      ],
    },
    en: {
      name: "Battery Pack",
      role: "The car's energy store. It feeds the motors and every electronic system on board.",
      specs: [
        ["Chemistry", "Li-ion"],
        ["Voltage", "48 V"],
        ["Energy", "1,680 Wh"],
        ["Range", "80–100 km"],
      ],
    },
  },
  Batarya_Fan: {
    tr: {
      name: "Batarya Soğutma Fanı",
      role: "Paketin içindeki hücreleri serin tutar; ısınan hücre hem verim hem ömür kaybeder.",
      specs: [],
    },
    en: {
      name: "Battery Cooling Fan",
      role: "Keeps the cells inside the pack cool; a hot cell loses both efficiency and lifespan.",
      specs: [],
    },
  },
  Koltuk: {
    tr: {
      name: "Koltuklar",
      role: "İki kişilik kokpit, sürücü koltuğu solda. Koltuklarda emniyet kemeri geçiş delikleri var.",
      specs: [],
    },
    en: {
      name: "Seats",
      role: "A two-seat cockpit with the driver on the left. The seats have slots for the safety harness.",
      specs: [],
    },
  },
  Direksiyon: {
    tr: {
      name: "Direksiyon",
      role: "Sürücünün aracı yönlendirdiği kumanda.",
      specs: [
        ["Sistem", "Kremayer-pinyon"],
        ["Dönüş yarıçapı", "3,47 m"],
      ],
    },
    en: {
      name: "Steering",
      role: "How the driver points the car.",
      specs: [
        ["System", "Rack and pinion"],
        ["Turning radius", "3.47 m"],
      ],
    },
  },
  Ekran: {
    tr: { name: "Göstergeler", role: "Sürücüye hız ve batarya durumu gibi bilgileri gösterir.", specs: [] },
    en: { name: "Displays", role: "Show the driver speed, battery state and the like.", specs: [] },
  },
  Kokpit: {
    tr: { name: "Kokpit Paneli", role: "Göstergelerin ve kumandaların yerleştiği ön panel.", specs: [] },
    en: { name: "Dashboard", role: "The panel that carries the displays and controls.", specs: [] },
  },
  Far: {
    tr: { name: "Farlar", role: "Önü aydınlatır ve aracın karşıdan görünmesini sağlar.", specs: [] },
    en: { name: "Headlights", role: "Light the way ahead and make the car visible from the front.", specs: [] },
  },
  Stop: {
    tr: { name: "Stop Lambası", role: "Fren yapıldığında yanarak arkadakileri uyarır.", specs: [] },
    en: { name: "Brake Light", role: "Lights up under braking to warn whoever is behind.", specs: [] },
  },
};

export function partInfo(key: PartKey, lang: Lang): PartInfo {
  return PARTS[key][lang];
}
