import { useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { PageHero } from "../components/PageHero";
import { sendContactMessage } from "../lib/formEndpoint";

const INSTAGRAM_URL = "https://www.instagram.com/voltaris.official/";

type PackageKey = "platinum" | "gold" | "silver" | "bronze" | "supporter" | "general";
const PACKAGE_KEYS: PackageKey[] = ["platinum", "gold", "silver", "bronze", "supporter", "general"];

export function Contact() {
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();

  // The sponsors page links here as /iletisim?paket=<tier>, so a company asking
  // about a package lands on a form that already says which one.
  const paket = searchParams.get("paket") as PackageKey | null;
  const validPackage = paket && PACKAGE_KEYS.includes(paket) ? paket : null;
  const presetSubject = validPackage ? t.contact.sponsorSubjects[validPackage] : "";

  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "sending") return;

    const data = new FormData(event.currentTarget);
    setStatus("sending");
    try {
      await sendContactMessage({
        name: String(data.get("name") ?? ""),
        email: String(data.get("email") ?? ""),
        subject: String(data.get("subject") ?? ""),
        message: String(data.get("message") ?? ""),
        packageId: validPackage ?? undefined,
        honeypot: String(data.get("website") ?? ""),
      });
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  return (
    <>
      <PageHero title={t.contact.heroTitle} subtitle={t.contact.heroSubtitle} />

      <section className="section">
        <div className="container contact__grid">
          {status === "sent" ? (
            <div className="contact-form contact-form--sent" role="status">
              <span className="contact-form__mark" aria-hidden="true">
                ✓
              </span>
              <h2>{t.contact.formSuccessTitle}</h2>
              <p>{t.contact.formSuccessText}</p>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => {
                  formRef.current?.reset();
                  setStatus("idle");
                }}
              >
                {t.contact.formAnother}
              </button>
            </div>
          ) : (
            <form className="contact-form" onSubmit={handleSubmit} ref={formRef}>
              <h2>{t.contact.formTitle}</h2>
              {/* Bot trap: invisible, unfocusable; a filled value is dropped server-side. */}
              <input
                type="text"
                name="website"
                className="honeypot"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
              />
              <label>
                {t.contact.formName}
                <input type="text" name="name" autoComplete="name" required />
              </label>
              <label>
                {t.contact.formEmail}
                <input type="email" name="email" autoComplete="email" required />
              </label>
              <label>
                {t.contact.formSubject}
                {/* Keyed so switching language re-applies the translated preset. */}
                <input type="text" name="subject" defaultValue={presetSubject} key={presetSubject} />
              </label>
              <label>
                {t.contact.formMessage}
                <textarea name="message" rows={6} required />
              </label>
              <button type="submit" className="btn btn--primary" disabled={status === "sending"}>
                {status === "sending" ? t.contact.formSending : t.contact.formSubmit}
              </button>
              {status === "error" && (
                <p className="form-field__error" role="alert">
                  {t.contact.formError}
                </p>
              )}
              <p className="note">{t.contact.formNote}</p>
            </form>
          )}

          <div className="contact-info">
            <h2>{t.contact.infoTitle}</h2>
            <ul>
              <li>
                <span className="contact-info__label">{t.contact.emailLabel}</span>
                <a href={`mailto:${t.contact.email}`}>{t.contact.email}</a>
              </li>
              <li>
                <span className="contact-info__label">{t.contact.addressLabel}</span>
                <span>{t.contact.address}</span>
              </li>
            </ul>
            <h3>{t.contact.socialTitle}</h3>
            <div className="social-links">
              <a className="social-links__slot" href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">
                Instagram ↗
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
