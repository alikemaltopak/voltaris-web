import { Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { SectionHeading } from "../components/SectionHeading";
import { PageHero } from "../components/PageHero";
import { Reveal } from "../components/Reveal";

export function Sponsors() {
  const { t } = useLanguage();

  return (
    <>
      <PageHero title={t.sponsors.heroTitle} subtitle={t.sponsors.heroSubtitle} />

      <section className="section">
        <div className="container">
          <SectionHeading title={t.sponsors.introTitle} />
          <p className="lead-text">{t.sponsors.introText}</p>
        </div>
      </section>

      <section className="section section--alt">
        <div className="container">
          <SectionHeading title={t.sponsors.currentSponsorsTitle} align="center" />
          <Reveal className="sponsor-logos" stagger=".sponsor-logo-slot">
            {Array.from({ length: 6 }).map((_, index) => (
              <div className="sponsor-logo-slot" key={index}>
                LOGO
              </div>
            ))}
          </Reveal>
          <p className="note note--center">{t.sponsors.currentSponsorsNote}</p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHeading title={t.sponsors.tiersTitle} align="center" />
          <Reveal className="tiers__grid" stagger=".tier-card">
            {t.sponsors.tiers.map((tier, index) => (
              <div className="tier-card" key={tier.name}>
                <span className="tier-card__index">/ {String(index + 1).padStart(2, "0")}</span>
                <h3>{tier.name}</h3>
                <p>{tier.description}</p>
              </div>
            ))}
          </Reveal>
          <p className="note note--center">{t.sponsors.tiersNote}</p>
        </div>
      </section>

      <section className="section join">
        <div className="container join__inner">
          <h2>{t.sponsors.ctaTitle}</h2>
          <p>{t.sponsors.ctaText}</p>
          <Link to="/iletisim" className="btn btn--primary">
            {t.sponsors.ctaButton}
          </Link>
        </div>
      </section>
    </>
  );
}
