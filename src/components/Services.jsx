import React from 'react';
import { Target, TrendingUp, Globe2, Cpu } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './Services.css';

export default function Services() {
  const { t } = useTranslation();

  const services = [
    {
      icon: <Target size={32} />,
      title: t('services.items.sales.title'),
      description: t('services.items.sales.desc')
    },
    {
      icon: <TrendingUp size={32} />,
      title: t('services.items.growth.title'),
      description: t('services.items.growth.desc')
    },
    {
      icon: <Globe2 size={32} />,
      title: t('services.items.culture.title'),
      description: t('services.items.culture.desc')
    },
    {
      icon: <Cpu size={32} />,
      title: t('services.items.ai.title'),
      description: t('services.items.ai.desc')
    }
  ];

  return (
    <section id="services" className="services section">
      <div className="container">
        <div className="section-header animate-fade-in-up">
          <div className="badge">{t('services.badge')}</div>
          <h2 className="section-title">{t('services.title_pt1')} <span className="text-gradient">{t('services.title_pt2')}</span></h2>
          <p className="section-subtitle">
            {t('services.subtitle')}
          </p>
        </div>
        
        <div className="services-grid">
          {services.map((service, index) => (
            <div 
              key={index} 
              className={`service-card glass-panel animate-fade-in-up delay-${(index % 3 + 1) * 100}`}
            >
              <div className="service-icon">
                {service.icon}
              </div>
              <h3 className="service-title">{service.title}</h3>
              <p className="service-desc">{service.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
