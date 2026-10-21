import { useLayoutEffect, useRef, type ReactNode } from "react";
import { gsap, ScrollTrigger } from "../lib/gsapSetup";
import { refreshScrollLimits, scrollToY } from "../lib/lenisInstance";
import { useLanguage } from "../context/LanguageContext";
import { TEAM_UNITS, type MemberLinks } from "../data/team";

const LINK_ORDER = ["linkedin", "instagram", "github", "mail"] as const;

/** While members' addresses are still being collected, every panel shows all
 *  four icons and the missing ones sit dimmed as "coming soon". Set to false
 *  once the links are in, so a member without, say, GitHub shows no icon. */
const SHOW_LINK_SLOTS = true;

/** How long the outgoing unit takes to clear before the next one draws. */
const OUT_S = 0.18;

/** Members are numbered straight through the board, like squad numbers. */
const UNIT_OFFSETS = TEAM_UNITS.map((_, i) =>
  TEAM_UNITS.slice(0, i).reduce((sum, unit) => sum + unit.members.length, 0),
);

const ICONS: Record<keyof MemberLinks, ReactNode> = {
  linkedin: (
    <path
      fill="currentColor"
      d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45z"
    />
  ),
  instagram: (
    <g fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
    </g>
  ),
  github: (
    <path
      fill="currentColor"
      d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.56-.29-5.25-1.28-5.25-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.7 5.39-5.27 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5z"
    />
  ),
  mail: (
    <g fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="5" width="18" height="14" />
      <path d="m3 6 9 7 9-7" />
    </g>
  ),
};

/**
 * The board as a broadcast-style lineup: the section pins and each unit takes
 * the screen in turn as the page scrolls, its panels wiping up from a light
 * bar and its members' clips playing once. Transitions run on their own clock
 * rather than being scrubbed, so a group is never left half-drawn mid-scroll.
 * With reduced motion the same markup simply stacks, photos only.
 */
export function TeamLineup() {
  const { t } = useLanguage();
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const stage = stageRef.current;
    if (!root || !stage) return undefined;

    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      root.classList.add("lineup--stage");
      const groups = gsap.utils.toArray<HTMLElement>(".lineup__group", root);
      const navItems = gsap.utils.toArray<HTMLElement>(".lineup__nav-item", root);
      gsap.set(groups, { autoAlpha: 0 });

      const timelines = groups.map((group) => {
        const tl = gsap.timeline({ paused: true });
        tl.fromTo(
          group.querySelectorAll(".lineup__head > *"),
          { y: 20, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, duration: 0.4, ease: "power3.out", stagger: 0.04 },
        )
          .fromTo(
            group.querySelectorAll(".lineup__bar"),
            { scaleX: 0 },
            { scaleX: 1, duration: 0.3, ease: "power2.out", stagger: 0.05 },
            0.05,
          )
          .fromTo(
            group.querySelectorAll(".lineup__media"),
            { clipPath: "inset(100% 0% 0% 0%)" },
            { clipPath: "inset(0% 0% 0% 0%)", duration: 0.55, ease: "power3.inOut", stagger: 0.06 },
            0.15,
          )
          .fromTo(
            group.querySelectorAll(".lineup__number, .lineup__info > *"),
            { y: 12, autoAlpha: 0 },
            { y: 0, autoAlpha: 1, duration: 0.35, ease: "power3.out", stagger: 0.02 },
            0.4,
          )
          // The slow push-in stands in for a clip until the member has one.
          .fromTo(
            group.querySelectorAll("img.lineup__still"),
            { scale: 1.14 },
            { scale: 1, duration: 2.4, ease: "power2.out" },
            0.15,
          );
        return tl;
      });

      let active = -1;
      let pending: gsap.core.Tween | null = null;
      const videosOf = (i: number) => Array.from(groups[i].querySelectorAll<HTMLVideoElement>("video"));

      // The outgoing unit is cleared before the next one starts drawing: both
      // sit in the same spot, and playing the entrance backwards left the old
      // panels on screen under the new ones for over a second.
      const hide = (i: number) => {
        timelines[i].pause();
        gsap.killTweensOf(groups[i]);
        gsap.to(groups[i], { autoAlpha: 0, y: -14, duration: OUT_S, ease: "power2.in" });
        videosOf(i).forEach((v) => v.pause());
      };
      const reveal = (i: number) => {
        gsap.killTweensOf(groups[i]);
        gsap.set(groups[i], { autoAlpha: 1, y: 0 });
        timelines[i].play(0);
        videosOf(i).forEach((v) => {
          v.currentTime = 0;
          v.play().catch(() => {});
        });
      };

      const show = (next: number) => {
        if (next === active) return;
        const prev = active;
        active = next;
        pending?.kill();
        pending = null;
        if (prev >= 0) hide(prev);
        navItems.forEach((item, i) => item.classList.toggle("is-active", i === next));
        if (next < 0) return;
        if (prev >= 0) pending = gsap.delayedCall(OUT_S, () => reveal(next));
        else reveal(next);
      };

      const stepPx = () => window.innerHeight * (window.innerWidth < 760 ? 0.6 : 0.7);
      const pin = ScrollTrigger.create({
        trigger: stage,
        start: "top top",
        end: () => "+=" + stepPx() * groups.length,
        pin: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          if (active < 0) return;
          show(Math.min(groups.length - 1, Math.floor(self.progress * groups.length)));
        },
      });
      // The first unit plays as the stage scrolls into view, not once it pins,
      // so nobody lands on an empty screen.
      ScrollTrigger.create({
        trigger: stage,
        start: "top 65%",
        onEnter: () => show(0),
        onLeaveBack: () => show(-1),
      });
      refreshScrollLimits();

      // The progress row doubles as a jump menu: each unit owns one step of
      // the pinned scroll, so land a third of the way into its step.
      const jumps = navItems.map((_, i) => () => scrollToY(pin.start + stepPx() * (i + 0.35)));
      navItems.forEach((item, i) => item.addEventListener("click", jumps[i]));

      return () => {
        pending?.kill();
        navItems.forEach((item, i) => item.removeEventListener("click", jumps[i]));
        root.classList.remove("lineup--stage");
        navItems.forEach((item) => item.classList.remove("is-active"));
      };
    });

    return () => mm.revert();
  }, []);

  return (
    <div className="lineup" ref={rootRef}>
      <div className="lineup__stage" ref={stageRef}>
        <div className="lineup__groups">
          {TEAM_UNITS.map((unit, unitIndex) => (
            <div className="lineup__group" key={unit.id}>
              <div className="lineup__head">
                <span className="lineup__kicker">
                  {t.team.lineupKicker} / {String(unitIndex + 1).padStart(2, "0")}
                </span>
                <h3 className="lineup__title">{t.team.units[unit.id]}</h3>
                <p className="lineup__tagline">{t.team.unitTaglines[unit.id]}</p>
              </div>
              <div className="lineup__panels">
                {unit.members.map((member, memberIndex) => {
                  const number = UNIT_OFFSETS[unitIndex] + memberIndex + 1;
                  const links = LINK_ORDER.filter((key) => SHOW_LINK_SLOTS || member.links?.[key]);
                  return (
                    <article className="lineup__panel" key={member.name}>
                      <div className="lineup__media">
                        {member.video ? (
                          <video
                            className="lineup__still"
                            src={member.video}
                            poster={member.photo}
                            muted
                            playsInline
                            preload="metadata"
                            aria-label={member.name}
                          />
                        ) : (
                          <img
                            className="lineup__still"
                            src={member.photo}
                            alt={member.name}
                            width={320}
                            height={320}
                            loading="lazy"
                            decoding="async"
                          />
                        )}
                        <span className="lineup__number" aria-hidden="true">
                          {String(number).padStart(2, "0")}
                        </span>
                      </div>
                      <span className="lineup__bar" aria-hidden="true" />
                      <div className="lineup__info">
                        {member.role && <span className="lineup__role">{t.team.roles[member.role]}</span>}
                        <h4 className="lineup__name">{member.name}</h4>
                        <p className="lineup__major">{t.team.majors[member.major]}</p>
                        {links.length > 0 && (
                          <ul className="lineup__links">
                            {links.map((key) => {
                              const value = member.links?.[key];
                              if (!value) {
                                return (
                                  <li key={key}>
                                    <span
                                      className="lineup__link-slot"
                                      title={`${t.team.linkLabels[key]} · ${t.team.linkSoon}`}
                                      aria-hidden="true"
                                    >
                                      <svg viewBox="0 0 24 24" width="16" height="16">
                                        {ICONS[key]}
                                      </svg>
                                    </span>
                                  </li>
                                );
                              }
                              return (
                                <li key={key}>
                                  <a
                                    href={key === "mail" ? `mailto:${value}` : value}
                                    target={key === "mail" ? undefined : "_blank"}
                                    rel="noopener noreferrer"
                                    aria-label={`${member.name} · ${t.team.linkLabels[key]}`}
                                  >
                                    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                                      {ICONS[key]}
                                    </svg>
                                  </a>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <ol className="lineup__nav" aria-label={t.team.lineupNavLabel}>
          {TEAM_UNITS.map((unit, i) => (
            <li key={unit.id}>
              <button type="button" className="lineup__nav-item">
                <span>{String(i + 1).padStart(2, "0")}</span> {t.team.units[unit.id]}
              </button>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
