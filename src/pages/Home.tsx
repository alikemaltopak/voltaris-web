import { useLayoutEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { useTheme } from "../context/ThemeContext";
import { SectionHeading } from "../components/SectionHeading";
import { HeroTitle } from "../components/HeroTitle";
import { Reveal } from "../components/Reveal";
import { HeroAssembly } from "../components/HeroAssembly";
import { Announcements } from "../components/Announcements";
import { gsap } from "../lib/gsapSetup";

/** The car is rendered light-bodied on a dark stage and black-bodied on a
 *  light one, so each theme gets its own sequence. Both are cut to the same
 *  175 frames on the same stage boundaries, so only the folder changes. */
const HERO_FRAMES_DARK = "ev-assembly-v9";
const HERO_FRAMES_LIGHT = "ev-assembly-light-v1";

/** Single-colour (white) versions of the official logos, taken from each
 *  institution's own website; the light theme darkens them in CSS. */
const PARTNER_LOGOS: Record<string, string> = {
  iyte: "/logos/iyte.png",
  teknofest: "/logos/teknofest.png",
  tubitak: "/logos/tubitak.svg",
};

export function Home() {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const heroRef = useRef<HTMLElement>(null);
  const heroActionsRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = heroRef.current;
    if (!el) return undefined;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return undefined;

    const ctx = gsap.context(() => {
      gsap.from(".hero__kicker, .hero__subtitle, .hero__tagline, .hero__scroll-hint", {
        y: 22,
        opacity: 0,
        duration: 0.9,
        ease: "power3.out",
        stagger: 0.09,
        delay: 0.55,
      });
    }, el);

    return () => ctx.revert();
  }, []);

  return (
    <>
      <section className="hero" ref={heroRef}>
        <HeroAssembly
          framesFolder={theme === "light" ? HERO_FRAMES_LIGHT : HERO_FRAMES_DARK}
          frameCount={175}
          triggerRef={heroRef}
          revealRef={heroActionsRef}
        />
        <span className="hero__kicker">{t.home.heroKicker}</span>
        <HeroTitle text={t.home.heroTitle} className="hero__title" />
        <p className="hero__subtitle">{t.home.heroSubtitle}</p>
        <div className="hero__actions hero__actions--await" ref={heroActionsRef}>
          <Link to="/arac" className="btn btn--primary">
            {t.home.ctaVehicle}
          </Link>
          <Link to="/sponsorlar" className="btn btn--ghost">
            {t.home.ctaSponsor}
          </Link>
        </div>
        <span className="hero__scroll-hint">{t.home.scrollHint}</span>
      </section>

      <section className="partners" aria-label={t.home.partnersKicker}>
        <Reveal className="container partners__inner" stagger=".partners__item">
          <p className="partners__kicker">{t.home.partnersKicker}</p>
          <ul className="partners__list">
            {t.home.partners.map((partner) => (
              <li className="partners__item" key={partner.id}>
                <img
                  className={`partners__logo partners__logo--${partner.id}`}
                  src={PARTNER_LOGOS[partner.id]}
                  alt={partner.name}
                  loading="lazy"
                  decoding="async"
                />
                <span className="partners__role">{partner.role}</span>
              </li>
            ))}
          </ul>
        </Reveal>
      </section>

      <Announcements />

      <section className="section about">
        <div className="container about__grid about__grid--solo">
          <Reveal>
            <SectionHeading kicker="VOLTARIS" title={t.home.aboutTitle} />
            <p className="about__text">{t.home.aboutText}</p>
            <ul className="about__points">
              {t.home.aboutPoints.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      <section className="section section--alt purpose">
        <Reveal className="container purpose__grid" stagger=".purpose__card">
          <article className="purpose__card">
            <span className="purpose__kicker">{t.home.visionKicker}</span>
            <h2>{t.home.visionTitle}</h2>
            <p>{t.home.visionText}</p>
          </article>
          <article className="purpose__card">
            <span className="purpose__kicker">{t.home.missionKicker}</span>
            <h2>{t.home.missionTitle}</h2>
            <p>{t.home.missionText}</p>
          </article>
        </Reveal>
      </section>

      <section className="section join">
        <Reveal className="container join__inner">
          <h2>{t.home.joinTitle}</h2>
          <p>{t.home.joinText}</p>
          <Link to="/basvurular" className="btn btn--primary">
            {t.home.joinCta}
          </Link>
        </Reveal>
      </section>
    </>
  );
}
