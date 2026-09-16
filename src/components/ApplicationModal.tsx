import { useEffect, useState, type FormEvent } from "react";
import { useLanguage } from "../context/LanguageContext";

export type Committee = {
  id: string;
  name: string;
  description: string;
};

type ApplicationModalProps = {
  committee: Committee;
  onClose: () => void;
};

export function ApplicationModal({ committee, onClose }: ApplicationModalProps) {
  const { t } = useLanguage();
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <div
      className="modal-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="application-modal-title">
        <button type="button" className="modal-close" aria-label="Close" onClick={onClose}>
          ×
        </button>

        <span className="modal-eyebrow">{t.applications.form.eyebrow}</span>
        <h2 id="application-modal-title">{committee.name}</h2>
        <p className="modal-desc">{committee.description}</p>

        {submitted ? (
          <p className="form-success">✓ {t.applications.form.success}</p>
        ) : (
          <form className="contact-form" onSubmit={handleSubmit}>
            <label>
              {t.applications.form.fullName}
              <input type="text" name="name" required />
            </label>
            <label>
              {t.applications.form.email}
              <input type="email" name="email" required />
            </label>
            <label>
              {t.applications.form.phone}
              <input type="tel" name="phone" />
            </label>
            <label>
              {t.applications.form.department}
              <input type="text" name="department" required />
            </label>
            <label>
              {t.applications.form.motivation}
              <textarea name="motivation" rows={4} required />
            </label>
            <label>
              {t.applications.form.portfolio}
              <input type="url" name="portfolio" placeholder="https://" />
            </label>
            <button type="submit" className="btn btn--primary">
              {t.applications.form.submit}
            </button>
            <p className="note">{t.applications.form.note}</p>
          </form>
        )}
      </div>
    </div>
  );
}
