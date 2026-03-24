import React, { useState, useEffect, useRef } from 'react';
import { Mail, Phone, MapPin, Send, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { siteConfig } from '../config';
import './Contact.css';

export default function Contact() {
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
          <div className="badge">Get in Touch</div>
          <h2 className="section-title">Start a <span className="text-gradient">Conversation</span></h2>
          <p className="section-subtitle">
            Ready to transform your business strategy? Contact us to schedule an introductory consultation.
          </p>
        </div>
        
        <div className="contact-grid">
          <div className="contact-info animate-fade-in-up delay-100">
            <div className="info-card glass-panel">
              <Mail className="info-icon" />
              <div>
                <h4>Email Us</h4>
                <p><a href={`mailto:info@stormberry.as`} style={{ color: 'inherit', textDecoration: 'none' }}>info@stormberry.as</a></p>
              </div>
            </div>
            <div className="info-card glass-panel">
              <Phone className="info-icon" />
              <div>
                <h4>Call Us</h4>
                <p><a href="tel:+4795043789" style={{ color: 'inherit', textDecoration: 'none' }}>+47 950 43 789</a><br/><span style={{fontSize: '0.8rem', opacity: 0.8}}>(Signal, Telegram, WhatsApp)</span></p>
              </div>
            </div>
            <div className="info-card glass-panel">
              <MapPin className="info-icon" />
              <div>
                <h4>Headquarters</h4>
                <address style={{ fontStyle: 'normal' }}>Bergen, Norway</address>
              </div>
            </div>
          </div>
          
          <div className="contact-form-container glass-panel animate-fade-in-up delay-200">
            <form className="contact-form" onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="name">Full Name</label>
                  <input type="text" id="name" value={formData.name} onChange={handleChange} placeholder={"John Doe"} required disabled={status === 'loading'} />
                </div>
                <div className="form-group">
                  <label htmlFor="email">Email Address</label>
                  <input type="email" id="email" value={formData.email} onChange={handleChange} placeholder={"john@example.com"} required disabled={status === 'loading'} />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="service">Service of Interest</label>
                <select id="service" value={formData.service} onChange={handleChange} required disabled={status === 'loading'}>
                  <option value="" disabled>Select a Service</option>
                  <option value="sales">Sales Training</option>
                  <option value="strategy">Strategic Growth</option>
                  <option value="culture">Cross-Cultural Communications</option>
                  <option value="ai">AI (also EU AI Act Article 4)</option>
                  <option value="other">Other Inquiry</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="message">Message</label>
                <textarea id="message" value={formData.message} onChange={handleChange} rows="4" placeholder={"How can we help you?"} required disabled={status === 'loading'}></textarea>
              </div>
              <div className="form-group checkbox-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', marginTop: '-0.5rem' }}>
                <input type="checkbox" id="sendCopy" checked={formData.sendCopy} onChange={handleChange} style={{ width: 'auto', marginBottom: '0' }} disabled={status === 'loading'} />
                <label htmlFor="sendCopy" style={{ marginBottom: '0', fontSize: '0.9rem', fontWeight: 'normal', cursor: 'pointer' }}>Send a copy to my email</label>
              </div>

              {/* Cloudflare Turnstile */}
              <div ref={turnstileRef} className="turnstile-container"></div>

              {status === 'success' && (
                <div className="form-status success-message" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success-color, #10b981)', marginBottom: '1rem', padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: 'var(--radius)', fontSize: '0.9rem' }}>
                  <CheckCircle2 size={18} />
                  <span>Thank you for your message, we will come back to you as soon as possible.</span>
                </div>
              )}
              
              {status === 'error' && (
                <div className="form-status error-message" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger-color, #ef4444)', marginBottom: '1rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: 'var(--radius)', fontSize: '0.9rem' }}>
                  <AlertCircle size={18} />
                  <span>Failed to send message. Please try again later.</span>
                </div>
              )}

              <button type="submit" className="btn btn-primary submit-btn" disabled={status === 'loading'}>
                {status === 'loading' ? (
                  <><Loader2 size={18} className="spin" /> Send Message...</>
                ) : (
                  <>Send Message <Send size={18} /></>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
