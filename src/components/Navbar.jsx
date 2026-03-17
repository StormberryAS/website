import React, { useState, useEffect } from 'react';
import { Menu, X, Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './Navbar.css';

const Navbar = () => {
  const { t, i18n } = useTranslation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState(() => {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    
    // Set standard theme
    document.documentElement.setAttribute('data-theme', theme);
    
    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleThemeChange = (e) => {
      const newTheme = e.matches ? 'dark' : 'light';
      setTheme(newTheme);
      document.documentElement.setAttribute('data-theme', newTheme);
    };
    
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleThemeChange);
    } else {
      mediaQuery.addListener(handleThemeChange); // Safari fallback
    }
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleThemeChange);
      } else {
        mediaQuery.removeListener(handleThemeChange);
      }
    };
  }, [theme]);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const toggleMenu = () => setMobileMenuOpen(!mobileMenuOpen);

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  const getLanguageFlag = (lng) => {
    switch (lng) {
      case 'no': return '🇳🇴';
      case 'pt': return '🇧🇷';
      case 'fr': return '🇫🇷';
      default: return '🇬🇧';
    }
  };

  return (
    <nav className={`navbar ${isScrolled ? 'scrolled' : ''}`}>
      <div className="container nav-container">
        <a href="#" className="logo">
          Stormberry<span className="text-gradient">.</span>
        </a>
        
        <div className={`nav-links ${mobileMenuOpen ? 'active' : ''}`}>
          <a href="#services" onClick={() => setMobileMenuOpen(false)}>{t('nav.services')}</a>
          <a href="#ai-directive" onClick={() => setMobileMenuOpen(false)}>{t('nav.ai_directive')}</a>
          <a href="#about" onClick={() => setMobileMenuOpen(false)}>{t('nav.about')}</a>
          <a href="#contact" className="btn btn-primary nav-btn" onClick={() => setMobileMenuOpen(false)}>{t('nav.contact')}</a>
          
          <div className="language-switcher">
            <button className="current-lang" aria-label="Current language">
              <span aria-hidden="true">{getLanguageFlag(i18n.language)}</span>
            </button>
            <div className="language-dropdown glass-panel" role="menu" aria-label="Language options">
              <button onClick={() => changeLanguage('en')} title="English" aria-label="English" role="menuitem"><span aria-hidden="true">🇬🇧</span></button>
              <button onClick={() => changeLanguage('no')} title="Norwegian" aria-label="Norwegian" role="menuitem"><span aria-hidden="true">🇳🇴</span></button>
              <button onClick={() => changeLanguage('pt')} title="Portuguese" aria-label="Portuguese" role="menuitem"><span aria-hidden="true">🇧🇷</span></button>
              <button onClick={() => changeLanguage('fr')} title="French" aria-label="French" role="menuitem"><span aria-hidden="true">🇫🇷</span></button>
            </div>
          </div>

          <button className="theme-toggle" onClick={toggleTheme} aria-label={t('nav.theme_switch')}>
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
        </div>

        <button className="mobile-toggle" onClick={toggleMenu}>
          {mobileMenuOpen ? <X size={24} color="var(--text-primary)" /> : <Menu size={24} color="var(--text-primary)" />}
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
