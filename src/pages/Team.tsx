import { useLanguage } from "../context/LanguageContext";
import { SectionHeading } from "../components/SectionHeading";
import { PageHero } from "../components/PageHero";
import { Reveal } from "../components/Reveal";
import { TEAM_UNITS } from "../data/team";

export function Team() {
  const { t } = useLanguage();

  return (
    <>
      <PageHero title={t.team.heroTitle} subtitle={t.team.heroSubtitle} />

      <section className="section">
        <div className="container">
          <SectionHeading kicker="VOLTARIS" title={t.team.introTitle} />
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
          <p className="members__intro">{t.team.membersIntro}</p>
          {TEAM_UNITS.map((unit) => (
            <div className="members__unit" key={unit.id}>
              <h3 className="members__unit-title">{t.team.units[unit.id]}</h3>
              <Reveal className="members__grid" stagger=".member-card">
                {unit.members.map((member) => (
                  <div className="member-card" key={member.name}>
                    <img
                      className="member-card__photo"
                      src={member.photo}
                      alt={member.name}
                      width={320}
                      height={320}
                      loading="lazy"
                      decoding="async"
                    />
                    {member.role && <span className="member-card__role">{t.team.roles[member.role]}</span>}
                    <h4>{member.name}</h4>
                    <p>{t.team.majors[member.major]}</p>
                  </div>
                ))}
              </Reveal>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
