import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { SectionHeading } from "../components/SectionHeading";
import { Reveal } from "../components/Reveal";
import { SponsorBand } from "../components/SponsorBand";
import { SponsorPackageModal } from "../components/SponsorPackageModal";
import { SPONSOR_TIERS, sponsors } from "../data/sponsors";

export function Sponsors() {
  const { t } = useLanguage();
  const [openTier, setOpenTier] = useState<number | null>(null);
  const closeModal = useCallback(() => setOpenTier(null), []);
  const tiers = t.sponsors.tiers;

  return (
    <>
      <section className="section section--alt sponsor-wall">
        <div className="container">
          <h1 className="sponsor-wall__title">{t.sponsors.currentSponsorsTitle}</h1>
        </div>

        {SPONSOR_TIERS.map((tier, index) => {
          const members = sponsors.filter((sponsor) => sponsor.tier === tier);
          if (members.length === 0) return null;
          return (
            <SponsorBand
              key={tier}
              tier={tier}
              index={index}
              title={t.sponsors.tierNames[tier]}
              members={members}
              direction={index % 2 === 0 ? "left" : "right"}
              visitLabel={t.sponsors.visitWebsite}
            />
          );
        })}
      </section>

      <section className="section">
        <div className="container">
          <SectionHeading title={t.sponsors.tiersTitle} subtitle={t.sponsors.tiersSubtitle} align="center" />
          <Reveal className="tiers__grid tiers__grid--packages" stagger=".tier-card">
            {tiers.map((tier, index) => (
              <button
                type="button"
                className={`tier-card tier-card--${tier.id}`}
                key={tier.id}
                onClick={() => setOpenTier(index)}
                aria-haspopup="dialog"
              >
                <span className="tier-card__index">/ {String(index + 1).padStart(2, "0")}</span>
                <h3>{tier.name}</h3>
                <span className="tier-card__price">{tier.price}</span>
                <ul className="tier-card__perks">
                  {tier.perks.map((perk) => (
                    <li key={perk}>{perk}</li>
                  ))}
                </ul>
                <span className="link-arrow tier-card__cta">{t.sponsors.packageModal.open} →</span>
              </button>
            ))}
          </Reveal>
        </div>
      </section>

      <section className="section join">
        <div className="container join__inner">
          <h2>{t.sponsors.ctaTitle}</h2>
          <p>{t.sponsors.ctaText}</p>
          <Link to="/iletisim?paket=general" className="btn btn--primary">
            {t.sponsors.ctaButton}
          </Link>
        </div>
      </section>

      {openTier !== null && (
        <SponsorPackageModal
          tier={tiers[openTier]}
          index={openTier}
          total={tiers.length}
          email={t.contact.email}
          onClose={closeModal}
        />
      )}
    </>
  );
}
