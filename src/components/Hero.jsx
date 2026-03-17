import React from 'react';
import { ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './Hero.css';

const Hero = () => {
  const { t } = useTranslation();
  return (
    <section className="hero" id="home">
      <div className="hero-background">
        <div className="glow glow-1"></div>
        <div className="glow glow-2"></div>
      </div>
      
      <div className="container hero-container">
        <div className="hero-content animate-fade-in-up">
          <div className="badge">{t('hero.badge')}</div>
          <h1 className="hero-title">
            {t('hero.title_pt1')} <br />
            <span className="text-gradient">{t('hero.title_pt2')}</span>
          </h1>
          <p className="hero-subtitle delay-100">
            {t('hero.subtitle')}
          </p>
          <div className="hero-actions delay-200">
            <a href="#contact" className="btn btn-primary">
              {t('hero.btn_partner')} <ArrowRight size={18} />
            </a>
            <a href="#services" className="btn btn-outline">
              {t('hero.btn_explore')}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
