import { useLanguage } from "../context/LanguageContext";
import { INSTAGRAM_HANDLE, INSTAGRAM_URL, TEAM_EMAIL } from "../data/social";

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.4" cy="6.6" r="1" className="footer-link__dot" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="5.5" width="18" height="13" rx="2" />
      <path d="M3.8 7l8.2 6 8.2-6" />
    </svg>
  );
}

export function Footer() {
  const { t } = useLanguage();
  const year = new Date().getFullYear();

  const links = [
    { href: INSTAGRAM_URL, label: t.footer.follow, value: INSTAGRAM_HANDLE, icon: <InstagramIcon />, external: true },
    { href: `mailto:${TEAM_EMAIL}`, label: t.footer.write, value: TEAM_EMAIL, icon: <MailIcon />, external: false },
  ];

  return (
    <footer className="footer">
      <div className="footer__inner">
        <div>
          <div className="footer__brand">VOLTARIS</div>
          <p className="footer__tagline">{t.footer.tagline}</p>
        </div>

        <ul className="footer__links">
          {links.map((link) => (
            <li key={link.href}>
              <a
                className="footer-link"
                href={link.href}
                {...(link.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              >
                <span className="footer-link__icon">{link.icon}</span>
                <span className="footer-link__text">
                  <span className="footer-link__label">{link.label}</span>
                  <span className="footer-link__value">{link.value}</span>
                </span>
                <span className="footer-link__arrow" aria-hidden="true">
                  ↗
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>

      <div className="footer__base">
        <p>
          © {year} Voltaris. {t.footer.rights}
        </p>
      </div>
    </footer>
  );
}
