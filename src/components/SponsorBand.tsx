import { useLayoutEffect, useRef, type CSSProperties } from "react";
import { gsap } from "../lib/gsapSetup";
import type { Sponsor, SponsorTier } from "../data/sponsors";

type SponsorBandProps = {
  tier: SponsorTier;
  index: number;
  title: string;
  members: Sponsor[];
  /** Which way the band travels as the page scrolls down. */
  direction: "left" | "right";
  visitLabel: string;
};

/**
 * Enough repeats that the band is well over twice the widest common screen, so
 * its ends never come into view while it slides. The images are shared, so the
 * repeats cost DOM nodes, not downloads.
 */
const ITEMS_PER_BAND = 18;
/** How far the band travels across the whole pass of the section, in % of its own width. */
const TRAVEL = 15;

const reduceMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function SponsorBand({ tier, index, title, members, direction, visitLabel }: SponsorBandProps) {
  const bandRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const still = reduceMotion();
  const copies = still ? 1 : Math.ceil(ITEMS_PER_BAND / members.length);

  useLayoutEffect(() => {
    const band = bandRef.current;
    const track = trackRef.current;
    if (!band || !track || still) return undefined;

    const [from, to] = direction === "left" ? [-5, -5 - TRAVEL] : [-5 - TRAVEL, -5];
    const ctx = gsap.context(() => {
      gsap.fromTo(
        track,
        { xPercent: from },
        {
          xPercent: to,
          ease: "none",
          scrollTrigger: { trigger: band, start: "top bottom", end: "bottom top", scrub: 0.6 },
        },
      );
    }, band);

    return () => ctx.revert();
  }, [direction, still]);

  return (
    <div className={`sponsor-band sponsor-band--${tier}${still ? " sponsor-band--still" : ""}`} ref={bandRef}>
      <div className="container sponsor-band__head">
        <span className="sponsor-band__index">/ {String(index + 1).padStart(2, "0")}</span>
        <h3 className="sponsor-band__name">{title}</h3>
        <span className="sponsor-band__rule" aria-hidden="true" />
        <span className="sponsor-band__count">{String(members.length).padStart(2, "0")}</span>
      </div>

      <div className="sponsor-band__viewport">
        <div className="sponsor-band__track" ref={trackRef}>
          {Array.from({ length: copies }).flatMap((_, copy) =>
            members.map((sponsor) => {
              // Only the first pass is real content; the repeats exist to fill
              // the band, so they're hidden from assistive tech and the tab order.
              const echo = copy > 0;
              const root = Math.sqrt(sponsor.ratio);
              return (
                <a
                  key={`${copy}-${sponsor.name}`}
                  className="sponsor-logo"
                  href={sponsor.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={echo ? undefined : `${sponsor.name} — ${visitLabel}`}
                  aria-hidden={echo || undefined}
                  tabIndex={echo ? -1 : undefined}
                >
                  <span
                    className="sponsor-logo__mark"
                    // Equal area rather than equal height: a 7:1 wordmark and a
                    // round badge carry the same visual weight side by side.
                    style={{ "--w": root, "--h": 1 / root } as CSSProperties}
                  >
                    {/* Both variants are in the DOM; the theme picks one in CSS, so
                        switching theme never waits on a network request. */}
                    <img
                      className={"sponsor-logo__img" + (sponsor.logoDark ? " sponsor-logo__img--light" : "")}
                      src={sponsor.logo}
                      alt={echo ? "" : sponsor.name}
                    />
                    {sponsor.logoDark && (
                      <img className="sponsor-logo__img sponsor-logo__img--dark" src={sponsor.logoDark} alt="" />
                    )}
                  </span>
                  <span className="sponsor-logo__name" aria-hidden="true">
                    {sponsor.name}
                  </span>
                </a>
              );
            }),
          )}
        </div>
      </div>
    </div>
  );
}
