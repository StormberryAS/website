import React from 'react';
import { Linkedin, Mail, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './About.css';

export default function About() {
  const { t } = useTranslation();
  return (
    <section id="about" className="about section">
      <div className="container">
        <div className="about-grid">
          <div className="about-image-container animate-fade-in delay-100">
            <div className="about-image-wrapper">
              <img src="/logo.png" alt="Stormberry A.S. Logo" className="about-logo" />
            </div>
          </div>
          
          <div className="about-content animate-fade-in-up delay-200">
            <div className="badge">{t('about.badge')}</div>
            <h2 className="section-title">
              {t('about.title_pt1')} <span className="text-gradient">{t('about.title_pt2')}</span>
            </h2>
            <p className="about-text">
              {t('about.desc1')}
            </p>
            <div className="experience-badge">
              <span className="years">10+</span>
              <span className="text">{t('about.badge_years')}</span>
            </div>
            <p className="about-text">
              {t('about.desc2')}
            </p>
            
            <div className="languages-section mt-4 mb-4">
              <p className="languages-text" style={{ color: 'var(--text-primary)', fontSize: '1.1rem', fontWeight: '500' }}>
                {t('about.languages')}
              </p>
            </div>
            
            <div className="about-actions mt-4">
              <a href="https://linkedin.com/company/stormberryas" target="_blank" rel="noopener noreferrer" className="btn btn-outline linkedin-btn">
                <Linkedin size={20} /> {t('about.btn_linkedin')}
              </a>
              <a href="#contact" className="btn btn-primary">
                {t('about.btn_talk')} <ArrowRight size={18} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
