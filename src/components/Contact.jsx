import React, { useState, useEffect, useRef } from 'react';
import { Mail, Phone, MapPin, Send, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { siteConfig } from '../config';
import './Contact.css';

export default function Contact() {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: '', email: '', service: '', message: '', sendCopy: false
  });
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [turnstileToken, setTurnstileToken] = useState('');
  const turnstileRef = useRef(null);
  const widgetIdRef = useRef(null);

  useEffect(() => {
    // Render Turnstile widget when the script is ready
    const renderWidget = () => {
      if (window.turnstile && turnstileRef.current && widgetIdRef.current === null) {
        widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
          sitekey: siteConfig.contact.turnstileSiteKey,
          callback: (token) => setTurnstileToken(token),
          'expired-callback': () => setTurnstileToken(''),
          theme: document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light',
        });
      }
    };

    // Try immediately in case script already loaded
    renderWidget();

    // Also listen for script load
    const interval = setInterval(() => {
      if (window.turnstile && widgetIdRef.current === null) {
        renderWidget();
        clearInterval(interval);
      }
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const handleChange = (e) => {
    const { id, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!turnstileToken) {
      setStatus('error');
      return;
    }

    setStatus('loading');
    
    try {
      const response = await fetch(siteConfig.contact.formsgUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, 'cf-turnstile-response': turnstileToken })
      });
      
      if (!response.ok) throw new Error('Network response was not ok');
      
      setStatus('success');
      setFormData({ name: '', email: '', service: '', message: '', sendCopy: false });
      // Reset Turnstile
      if (window.turnstile && widgetIdRef.current !== null) {
        window.turnstile.reset(widgetIdRef.current);
        setTurnstileToken('');
      }
    } catch (error) {
      console.error('Submission error:', error);
      setStatus('error');
    }
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
                <address style={{ fontStyle: 'normal' }}>{t('contact.hq_val')}</address>
              </div>
            </div>
          </div>
          
          <div className="contact-form-container glass-panel animate-fade-in-up delay-200">
            <form className="contact-form" onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="name">{t('contact.form_name')}</label>
                  <input type="text" id="name" value={formData.name} onChange={handleChange} placeholder={t('contact.form_name_ph')} required disabled={status === 'loading'} />
                </div>
                <div className="form-group">
                  <label htmlFor="email">{t('contact.form_email')}</label>
                  <input type="email" id="email" value={formData.email} onChange={handleChange} placeholder={t('contact.form_email_ph')} required disabled={status === 'loading'} />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="service">{t('contact.form_service')}</label>
                <select id="service" value={formData.service} onChange={handleChange} required disabled={status === 'loading'}>
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
                <textarea id="message" value={formData.message} onChange={handleChange} rows="4" placeholder={t('contact.form_message_ph')} required disabled={status === 'loading'}></textarea>
              </div>
              <div className="form-group checkbox-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', marginTop: '-0.5rem' }}>
                <input type="checkbox" id="sendCopy" checked={formData.sendCopy} onChange={handleChange} style={{ width: 'auto', marginBottom: '0' }} disabled={status === 'loading'} />
                <label htmlFor="sendCopy" style={{ marginBottom: '0', fontSize: '0.9rem', fontWeight: 'normal', cursor: 'pointer' }}>{t('contact.form_send_copy')}</label>
              </div>

              {/* Cloudflare Turnstile */}
              <div ref={turnstileRef} className="turnstile-container"></div>

              {status === 'success' && (
                <div className="form-status success-message" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success-color, #10b981)', marginBottom: '1rem', padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: 'var(--radius)', fontSize: '0.9rem' }}>
                  <CheckCircle2 size={18} />
                  <span>{t('contact.form_success')}</span>
                </div>
              )}
              
              {status === 'error' && (
                <div className="form-status error-message" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger-color, #ef4444)', marginBottom: '1rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: 'var(--radius)', fontSize: '0.9rem' }}>
                  <AlertCircle size={18} />
                  <span>{t('contact.form_error')}</span>
                </div>
              )}

              <button type="submit" className="btn btn-primary submit-btn" disabled={status === 'loading'}>
                {status === 'loading' ? (
                  <><Loader2 size={18} className="spin" /> {t('contact.form_btn')}...</>
                ) : (
                  <>{t('contact.form_btn')} <Send size={18} /></>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
