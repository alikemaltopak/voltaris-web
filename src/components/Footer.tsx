import { useLanguage } from "../context/LanguageContext";

export function Footer() {
  const { t } = useLanguage();
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer__inner">
        <div>
          <div className="footer__brand">VOLTARIS</div>
          <p className="footer__tagline">{t.footer.tagline}</p>
        </div>
        <div className="footer__meta">
          <p>
            © {year} Voltaris. {t.footer.rights}
          </p>
        </div>
      </div>
    </footer>
  );
}
