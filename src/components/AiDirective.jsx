import React from 'react';
import { ShieldCheck, BookOpen, AlertCircle, Cpu } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './AiDirective.css';

export default function AiDirective() {
  const { t } = useTranslation();
  return (
    <section id="ai-directive" className="ai-directive section">
      <div className="container">
        <div className="ai-grid">
          <div className="ai-content animate-fade-in-up">
            <div className="badge">{t('ai.badge')}</div>
            <h2 className="section-title">
              {t('ai.title_pt1')} <br />
              <span className="text-gradient">{t('ai.title_pt2')}</span>
            </h2>
            <p className="ai-desc">
              {t('ai.desc')}
            </p>
            
            <ul className="ai-features">
              <li>
                <ShieldCheck className="feature-icon" size={24} />
                <div>
                  <h4>{t('ai.features.compliance.title')}</h4>
                  <p>{t('ai.features.compliance.desc')}</p>
                </div>
              </li>
              <li>
                <BookOpen className="feature-icon" size={24} />
                <div>
                  <h4>{t('ai.features.literacy.title')}</h4>
                  <p>{t('ai.features.literacy.desc')}</p>
                </div>
              </li>
              <li>
                <AlertCircle className="feature-icon" size={24} />
                <div>
                  <h4>{t('ai.features.risk.title')}</h4>
                  <p>{t('ai.features.risk.desc')}</p>
                </div>
              </li>
            </ul>
            
            <a href="#contact" className="btn btn-primary mt-4">
              {t('ai.btn')}
            </a>
          </div>
          
          <div className="ai-visual animate-fade-in-up delay-200">
            <div className="glass-panel visual-card">
              <div className="pulse-circle"></div>
              <ShieldCheck className="visual-icon" size={80} />
              <h3>{t('ai.card.title')}</h3>
              <p>{t('ai.card.desc')}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
