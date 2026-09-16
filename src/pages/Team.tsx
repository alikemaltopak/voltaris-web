import { useLanguage } from "../context/LanguageContext";
import { SectionHeading } from "../components/SectionHeading";
import { PageHero } from "../components/PageHero";
import { Reveal } from "../components/Reveal";

const MEMBER_PLACEHOLDER_COUNT = 6;

export function Team() {
  const { t } = useLanguage();

  return (
    <>
      <PageHero title={t.team.heroTitle} subtitle={t.team.heroSubtitle} />

      <section className="section">
        <div className="container">
          <SectionHeading kicker="Voltaris" title={t.team.introTitle} />
          <p className="lead-text">{t.team.introText}</p>
        </div>
      </section>

      <section className="section section--alt">
        <div className="container">
          <SectionHeading title={t.team.departmentsTitle} align="center" />
          <Reveal className="departments__grid" stagger=".department-card">
            {t.team.departments.map((dept, index) => (
              <div className="department-card" key={dept.name}>
                <span className="department-card__index">/ {String(index + 1).padStart(2, "0")}</span>
                <h3>{dept.name}</h3>
                <p>{dept.description}</p>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHeading title={t.team.membersTitle} align="center" />
          <Reveal className="members__grid" stagger=".member-card">
            {Array.from({ length: MEMBER_PLACEHOLDER_COUNT }).map((_, index) => (
              <div className="member-card" key={index}>
                <div className="member-card__avatar" aria-hidden="true" />
                <h4>{t.team.memberPlaceholder}</h4>
                <p>{t.team.rolePlaceholder}</p>
              </div>
            ))}
          </Reveal>
          <p className="note note--center">{t.team.membersNote}</p>
        </div>
      </section>
    </>
  );
}
