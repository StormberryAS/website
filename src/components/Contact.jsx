import React from 'react';
import { Mail, Phone, MapPin, Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './Contact.css';

export default function Contact() {
  const { t } = useTranslation();
  const handleSubmit = (e) => {
    e.preventDefault();
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const service = document.getElementById('service').value;
    const message = document.getElementById('message').value;
    
    const subject = encodeURIComponent(`Website Inquiry: ${service}`);
    const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\nService: ${service}\n\nMessage:\n${message}`);
    const recipient = t('contact.email_address');
    
    window.open(`mailto:${recipient}?subject=${subject}&body=${body}`, '_blank');
  };

  return (
    <section id="contact" className="contact section">
      <div className="container">
        <div className="section-header animate-fade-in-up">
          <div className="badge">{t('contact.badge')}</div>
          <h2 className="section-title">{t('contact.title_pt1')} <span className="text-gradient">{t('contact.title_pt2')}</span></h2>
          <p className="section-subtitle">
            {t('contact.subtitle')}
          </p>
        </div>
        
        <div className="contact-grid">
          <div className="contact-info animate-fade-in-up delay-100">
            <div className="info-card glass-panel">
              <Mail className="info-icon" />
              <div>
                <h4>{t('contact.email')}</h4>
                <p><a href={`mailto:${t('contact.email_address')}`} style={{ color: 'inherit', textDecoration: 'none' }}>{t('contact.email_address')}</a></p>
              </div>
            </div>
            <div className="info-card glass-panel">
              <Phone className="info-icon" />
              <div>
                <h4>{t('contact.call')}</h4>
                <p><a href="tel:+4795043789" style={{ color: 'inherit', textDecoration: 'none' }}>+47 950 43 789</a><br/><span style={{fontSize: '0.8rem', opacity: 0.8}}>(Signal, Telegram, WhatsApp)</span></p>
              </div>
            </div>
            <div className="info-card glass-panel">
              <MapPin className="info-icon" />
              <div>
                <h4>{t('contact.hq')}</h4>
                <p>{t('contact.hq_val')}</p>
              </div>
            </div>
          </div>
          
          <div className="contact-form-container glass-panel animate-fade-in-up delay-200">
            <form className="contact-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="name">{t('contact.form_name')}</label>
                <input type="text" id="name" placeholder={t('contact.form_name_ph')} required />
              </div>
              <div className="form-group">
                <label htmlFor="email">{t('contact.form_email')}</label>
                <input type="email" id="email" placeholder={t('contact.form_email_ph')} required />
              </div>
              <div className="form-group">
                <label htmlFor="service">{t('contact.form_service')}</label>
                <select id="service" required defaultValue="">
                  <option value="" disabled>{t('contact.form_service_select')}</option>
                  <option value="sales">{t('contact.form_service_sales')}</option>
                  <option value="strategy">{t('contact.form_service_strategy')}</option>
                  <option value="culture">{t('contact.form_service_culture')}</option>
                  <option value="ai">{t('contact.form_service_ai')}</option>
                  <option value="other">{t('contact.form_service_other')}</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="message">{t('contact.form_message')}</label>
                <textarea id="message" rows="4" placeholder={t('contact.form_message_ph')} required></textarea>
              </div>
              <button type="submit" className="btn btn-primary submit-btn">
                {t('contact.form_btn')} <Send size={18} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
