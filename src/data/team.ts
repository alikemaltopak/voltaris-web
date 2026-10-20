/** The 2026–27 board, as introduced on Instagram on 15 October 2026. Names
 *  stay as written; unit, major and role labels live in the i18n files so
 *  they switch with the language. Portraits are cropped from that post's
 *  slides into `public/team/`. */
export type UnitId = "leadership" | "electrical" | "mechanical" | "support";
export type MajorId = "mechanicalDept" | "mechanical" | "computer" | "electronics" | "energy";
export type RoleId = "advisor" | "captain" | "lead";

export type TeamMember = {
  name: string;
  photo: string;
  major: MajorId;
  role?: RoleId;
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
