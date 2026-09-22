export type SponsorTier = "platinum" | "gold" | "silver";

export type Sponsor = {
  name: string;
  tier: SponsorTier;
  /** Full-colour mark on a transparent background, as drawn for light paper. */
  logo: string;
  /**
   * Reversed version for the dark theme: brand colours kept, only the dark
   * wordmark lifted to light. Omitted where the mark is a self-contained badge
   * that already reads on dark (Pilci, Habaş, Alaçatı Bisiklet).
   */
  logoDark?: string;
  /** Width / height of the trimmed mark — drives equal-area sizing on the page. */
  ratio: number;
  website: string;
};

/** Highest first; the sponsors page renders one band per tier in this order. */
export const SPONSOR_TIERS: SponsorTier[] = ["platinum", "gold", "silver"];

// Tiers follow the team's Instagram announcements, which supersede the old
// site (adzetto.github.io/voltaris) where Pilci and TekYaz were listed as gold
// and CN Enerji as platinum. Habaş and Cevher Jant come from the old site only.
export const sponsors: Sponsor[] = [
  {
    name: "Bias Mühendislik",
    tier: "platinum",
    logo: "/sponsors/bias-muhendislik.svg",
    logoDark: "/sponsors/bias-muhendislik-dark.svg",
    ratio: 2.09,
    website: "https://bias.com.tr/",
  },
  { name: "Pilci", tier: "platinum", logo: "/sponsors/pilci.png", ratio: 3.305, website: "https://pilci.com.tr/" },
  {
    name: "TekYaz Mühendislik",
    tier: "platinum",
    logo: "/sponsors/tekyaz.svg",
    logoDark: "/sponsors/tekyaz-dark.svg",
    ratio: 3.644,
    website: "https://tekyaz.com/",
  },
  {
    name: "CN Enerji",
    tier: "gold",
    logo: "/sponsors/cn-enerji.png",
    logoDark: "/sponsors/cn-enerji-dark.png",
    ratio: 2.932,
    website: "https://cn.com.tr/",
  },
  {
    name: "Güran Nakliyat",
    tier: "gold",
    logo: "/sponsors/guran-nakliyat.png",
    logoDark: "/sponsors/guran-nakliyat-dark.png",
    ratio: 7.432,
    website: "http://www.gurannakliyat.com/",
  },
  { name: "Habaş", tier: "gold", logo: "/sponsors/habas.png", ratio: 4.014, website: "https://www.habas.com.tr/" },
  {
    name: "Alaçatı Bisiklet",
    tier: "silver",
    logo: "/sponsors/alacati-bisiklet.png",
    ratio: 1,
    website: "https://alacatibisiklet.com/",
  },
  {
    name: "Cevher Jant",
    tier: "silver",
    logo: "/sponsors/cevher-jant.png",
    logoDark: "/sponsors/cevher-jant-dark.png",
    ratio: 4.982,
    website: "https://www.cevher.com/",
  },
];
