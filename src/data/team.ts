/** The 2026–27 board, as introduced on Instagram on 15 October 2026. Names
 *  stay as written; unit, major and role labels live in the i18n files so
 *  they switch with the language. Portraits are cropped from that post's
 *  slides into `public/team/`.
 *
 *  `video`: a 2–3 s muted clip (e.g. `/team/video/ali-kemal-topak.mp4`) that
 *  plays when the member's unit comes up on the team page; until one is
 *  set, the photo stands in. `links`: only the ones filled in are shown. */
export type UnitId = "leadership" | "electrical" | "mechanical" | "support";
export type MajorId = "mechanicalDept" | "mechanical" | "computer" | "electronics" | "energy";
export type RoleId = "advisor" | "captain" | "lead";

export type MemberLinks = {
  linkedin?: string;
  instagram?: string;
  github?: string;
  /** A plain address; rendered as a mailto: link. */
  mail?: string;
};

export type TeamMember = {
  name: string;
  photo: string;
  video?: string;
  major: MajorId;
  role?: RoleId;
  links?: MemberLinks;
};

export const TEAM_UNITS: { id: UnitId; members: TeamMember[] }[] = [
  {
    id: "leadership",
    members: [
      { name: "Prof. Dr. Erdal Çetkin", photo: "/team/erdal-cetkin.webp", major: "mechanicalDept", role: "advisor" },
      { name: "Ali Kemal Topak", photo: "/team/ali-kemal-topak.webp", major: "computer", role: "captain" },
    ],
  },
  {
    id: "electrical",
    members: [
      { name: "Özgür Sönmez", photo: "/team/ozgur-sonmez.webp", major: "electronics", role: "lead" },
      { name: "Hasan Ali Kınaş", photo: "/team/hasan-ali-kinas.webp", major: "electronics" },
      { name: "Ali Kılıçlı", photo: "/team/ali-kilicli.webp", major: "electronics" },
      { name: "Murat Korhan Yaman", photo: "/team/murat-korhan-yaman.webp", major: "electronics" },
    ],
  },
  {
    id: "mechanical",
    members: [
      { name: "Yusuf Çağlayan", photo: "/team/yusuf-caglayan.webp", major: "mechanical" },
      { name: "Ahmet Çağlar Sarı", photo: "/team/ahmet-caglar-sari.webp", major: "energy" },
    ],
  },
  {
    id: "support",
    members: [
      { name: "Ali İhsan Ertoy", photo: "/team/ali-ihsan-ertoy.webp", major: "computer" },
      { name: "İlker Burak Eker", photo: "/team/ilker-burak-eker.webp", major: "energy" },
    ],
  },
];
