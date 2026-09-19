import { useLayoutEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { SectionHeading } from "../components/SectionHeading";
import { PlaceholderBox } from "../components/PlaceholderBox";
import { HeroTitle } from "../components/HeroTitle";
import { Reveal } from "../components/Reveal";
import { HeroDisassembly } from "../components/HeroDisassembly";
import { gsap } from "../lib/gsapSetup";

export function Home() {
  const { t } = useLanguage();
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
        <HeroDisassembly
          framesFolder="ev-assembly-v3"
          frameCount={158}
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

      <section className="section about">
        <div className="container about__grid">
          <Reveal>
            <SectionHeading kicker="Voltaris" title={t.home.aboutTitle} />
            <p className="about__text">{t.home.aboutText}</p>
            <ul className="about__points">
              {t.home.aboutPoints.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </Reveal>
          <PlaceholderBox icon="image" title={t.home.teamPhotoTitle} text={t.home.teamPhotoText} />
        </div>
      </section>

      <section className="section teaser">
        <Reveal className="container teaser__grid" stagger=".teaser__card">
          <div className="teaser__card">
            <span className="card-num">/ 01</span>
            <h3>{t.home.vehicleTeaserTitle}</h3>
            <p>{t.home.vehicleTeaserText}</p>
            <Link to="/arac" className="link-arrow">
              {t.home.vehicleTeaserCta} →
            </Link>
          </div>
          <div className="teaser__card">
            <span className="card-num">/ 02</span>
            <h3>{t.home.sponsorsTeaserTitle}</h3>
            <p>{t.home.sponsorsTeaserText}</p>
            <Link to="/sponsorlar" className="link-arrow">
              {t.home.sponsorsTeaserCta} →
            </Link>
          </div>
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
