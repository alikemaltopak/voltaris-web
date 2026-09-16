import { useState, type FormEvent } from "react";
import { useLanguage } from "../context/LanguageContext";
import { PageHero } from "../components/PageHero";

export function Contact() {
  const { t } = useLanguage();
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <>
      <PageHero title={t.contact.heroTitle} subtitle={t.contact.heroSubtitle} />

      <section className="section">
        <div className="container contact__grid">
          <form className="contact-form" onSubmit={handleSubmit}>
            <h2>{t.contact.formTitle}</h2>
            <label>
              {t.contact.formName}
              <input type="text" name="name" required />
            </label>
            <label>
              {t.contact.formEmail}
              <input type="email" name="email" required />
            </label>
            <label>
              {t.contact.formSubject}
              <input type="text" name="subject" />
            </label>
            <label>
              {t.contact.formMessage}
              <textarea name="message" rows={5} required />
            </label>
            <button type="submit" className="btn btn--primary">
              {t.contact.formSubmit}
            </button>
            {submitted && <p className="form-success">✓ {t.contact.formNote}</p>}
            <p className="note">{t.contact.formNote}</p>
          </form>

          <div className="contact-info">
            <h2>{t.contact.infoTitle}</h2>
            <ul>
              <li>
                <span className="contact-info__label">Email</span>
                <a href={`mailto:${t.contact.email}`}>{t.contact.email}</a>
              </li>
              <li>
                <span className="contact-info__label">{t.contact.heroTitle}</span>
                <span>{t.contact.address}</span>
              </li>
            </ul>
            <h3>{t.contact.socialTitle}</h3>
            <div className="social-links">
              <span className="social-links__slot">Instagram</span>
              <span className="social-links__slot">LinkedIn</span>
              <span className="social-links__slot">YouTube</span>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
