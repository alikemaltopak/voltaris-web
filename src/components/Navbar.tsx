import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { useTheme } from "../context/ThemeContext";

export function Navbar() {
  const { t, lang, toggleLang } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  const links = [
    { to: "/", label: t.nav.home },
    { to: "/takim", label: t.nav.team },
    { to: "/arac", label: t.nav.vehicle },
    { to: "/sponsorlar", label: t.nav.sponsors },
    { to: "/iletisim", label: t.nav.contact },
  ];

  return (
    <header className="navbar">
      <div className="navbar__inner">
        <NavLink to="/" className="navbar__brand" onClick={() => setMenuOpen(false)}>
          <span className="navbar__brand-mark" aria-hidden="true" />
          VOLTARIS
        </NavLink>

        <nav className={`navbar__links${menuOpen ? " navbar__links--open" : ""}`} aria-label="Main navigation">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/"}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) => `navbar__link${isActive ? " navbar__link--active" : ""}`}
            >
              {link.label}
            </NavLink>
          ))}
          {/* a plain link: the team panel is its own page outside the React router */}
          <a href="/panel/" className="navbar__link" onClick={() => setMenuOpen(false)}>
            {t.nav.panel}
          </a>
        </nav>

        <div className="navbar__actions">
          <button type="button" className="mono-toggle" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === "light" ? t.nav.themeLight : t.nav.themeDark}
          </button>
          <button type="button" className="mono-toggle lang-toggle" onClick={toggleLang} aria-label="Toggle language">
            <span className={lang === "tr" ? "lang-toggle__active" : ""}>TR</span>
            <span className="lang-toggle__sep">/</span>
            <span className={lang === "en" ? "lang-toggle__active" : ""}>EN</span>
          </button>
          <button
            type="button"
            className={`nav-toggle${menuOpen ? " nav-toggle--open" : ""}`}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>
    </header>
  );
}
