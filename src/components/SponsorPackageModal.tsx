import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { lockScroll, unlockScroll } from "../lib/lenisInstance";

type Tier = ReturnType<typeof useLanguage>["t"]["sponsors"]["tiers"][number];

type SponsorPackageModalProps = {
  tier: Tier;
  /** 0-based position in the tier list, shown as "1 / 5". */
  index: number;
  total: number;
  email: string;
  onClose: () => void;
};

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * The detail card a sponsor sees after tapping a package. Rendered into <body>
 * because the package cards sit inside Reveal wrappers that carry transforms,
 * and a transformed ancestor would trap position: fixed inside it.
 */
export function SponsorPackageModal({ tier, index, total, email, onClose }: SponsorPackageModalProps) {
  const { t } = useLanguage();
  const m = t.sponsors.packageModal;
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    lockScroll();
    closeRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      // Keep Tab inside the dialog while it's open.
      if (event.key !== "Tab" || !dialogRef.current) return;
      const items = [...dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      unlockScroll();
      opener?.focus();
    };
  }, [onClose]);

  const titleId = `package-${tier.id}-title`;

  return createPortal(
    <div className="package-modal" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div
        className={`package-modal__card package-modal__card--${tier.id}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={dialogRef}
        // Lenis would otherwise swallow wheel events meant for this scroll box.
        data-lenis-prevent
      >
        <div className="package-modal__glow" aria-hidden="true" />

        <header className="package-modal__head">
          <span className="package-modal__kicker">
            / {String(index + 1).padStart(2, "0")} · {m.kicker}
          </span>
          <button type="button" className="package-modal__close" onClick={onClose} ref={closeRef} aria-label={m.close}>
            <span aria-hidden="true">×</span>
          </button>
        </header>

        <div className="package-modal__title-row">
          <h2 id={titleId}>{tier.name}</h2>
          <span className="package-modal__price">{tier.price}</span>
        </div>
        <p className="package-modal__summary">{tier.summary}</p>

        <dl className="package-modal__stats">
          <div>
            <dt>{m.rank}</dt>
            <dd>
              {index + 1} / {total}
            </dd>
          </div>
          <div>
            <dt>{m.onCar}</dt>
            <dd>{tier.onCar}</dd>
          </div>
        </dl>

        <h3 className="package-modal__section">{m.coverage}</h3>
        <ol className="package-modal__details">
          {tier.details.map((detail, i) => (
            <li key={detail.title}>
              <span className="package-modal__num">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <strong>{detail.title}</strong>
                <p>{detail.text}</p>
              </div>
            </li>
          ))}
        </ol>

        {tier.collaboration && (
          <>
            <h3 className="package-modal__section">{m.collabTitle}</h3>
            <p className="package-modal__collab-intro">{m.collabIntro}</p>
            <ul className="package-modal__collab">
              {m.collabItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </>
        )}

        <footer className="package-modal__actions">
          <Link to={`/iletisim?paket=${tier.id}`} className="btn btn--primary" onClick={onClose}>
            {m.cta}
          </Link>
          <a
            className="btn btn--ghost"
            href={`mailto:${email}?subject=${encodeURIComponent(t.contact.sponsorSubjects[tier.id as keyof typeof t.contact.sponsorSubjects])}`}
          >
            {m.mail}
          </a>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
