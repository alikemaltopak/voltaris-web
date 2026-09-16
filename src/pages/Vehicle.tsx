import { useLanguage } from "../context/LanguageContext";
import { SectionHeading } from "../components/SectionHeading";
import { PageHero } from "../components/PageHero";
import { PlaceholderBox } from "../components/PlaceholderBox";
import { CarSketchReveal } from "../components/CarSketchReveal";
import { Reveal } from "../components/Reveal";

export function Vehicle() {
  const { t } = useLanguage();

  return (
    <>
      <PageHero title={t.vehicle.heroSubtitle} subtitle={t.vehicle.heroTagline} />

      <CarSketchReveal eyebrow={t.vehicle.sketchEyebrow} note={t.vehicle.sketchNote} />

      <section className="section">
        <div className="container vehicle__grid">
          <PlaceholderBox
            icon="model"
            title={t.vehicle.modelPlaceholderTitle}
            text={t.vehicle.modelPlaceholderText}
            className="placeholder-box--tall"
          />
          <Reveal>
            <SectionHeading kicker={t.vehicle.heroTitle} title={t.vehicle.specsTitle} />
            <dl className="specs-list">
              {t.vehicle.specs.map((spec) => (
                <div className="specs-list__row" key={spec.label}>
                  <dt>{spec.label}</dt>
                  <dd>{spec.value}</dd>
                </div>
              ))}
            </dl>
            <p className="note">{t.vehicle.specsNote}</p>
          </Reveal>
        </div>
      </section>

      <section className="section section--alt">
        <div className="container">
          <SectionHeading title={t.vehicle.timelineTitle} align="center" />
          <Reveal className="timeline" stagger=".timeline__step">
            {t.vehicle.timeline.map((step, index) => (
              <div className="timeline__step" key={step.phase}>
                <span className="timeline__index">/ {String(index + 1).padStart(2, "0")}</span>
                <h3>{step.phase}</h3>
                <p>{step.description}</p>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHeading title={t.vehicle.photosPlaceholderTitle} align="center" />
          <Reveal className="gallery-grid" stagger=".placeholder-box">
            {Array.from({ length: 4 }).map((_, index) => (
              <PlaceholderBox
                key={index}
                icon="gallery"
                title={t.vehicle.photosPlaceholderTitle}
                text={t.vehicle.photosPlaceholderText}
              />
            ))}
          </Reveal>
        </div>
      </section>
    </>
  );
}
