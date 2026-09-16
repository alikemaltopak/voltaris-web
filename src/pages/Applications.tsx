import { useState } from "react";
import { useLanguage } from "../context/LanguageContext";
import { PageHero } from "../components/PageHero";
import { ApplicationModal, type Committee } from "../components/ApplicationModal";
import { Reveal } from "../components/Reveal";

export function Applications() {
  const { t } = useLanguage();
  const [activeCommittee, setActiveCommittee] = useState<Committee | null>(null);

  return (
    <>
      <PageHero title={t.applications.heroTitle} subtitle={t.applications.heroSubtitle} />

      <section className="section">
        <div className="container">
          <div className="sec-label">
            <span>{t.applications.sectionLabelLeft}</span>
            <span>{t.applications.sectionLabelRight}</span>
          </div>

          <Reveal className="komite-grid" stagger=".komite-card">
            {t.applications.committees.map((committee, index) => (
              <button
                key={committee.id}
                type="button"
                className="komite-card"
                onClick={() => setActiveCommittee(committee)}
              >
                <span className="komite-card__num">/ {String(index + 1).padStart(2, "0")}</span>
                <h3>{committee.name}</h3>
                <p>{committee.description}</p>
                <span className="komite-card__go">
                  {t.applications.applyLabel} <span>→</span>
                </span>
              </button>
            ))}
          </Reveal>
        </div>
      </section>

      <section className="section join">
        <div className="container join__inner">
          <h2>{t.applications.closingTitle}</h2>
          <p>{t.applications.closingText}</p>
          <p className="note note--center">{t.applications.closingNote}</p>
        </div>
      </section>

      {activeCommittee && (
        <ApplicationModal committee={activeCommittee} onClose={() => setActiveCommittee(null)} />
      )}
    </>
  );
}
