import React from 'react';
import { Linkedin, ArrowRight } from 'lucide-react';
import { siteConfig } from '../config';
import './About.css';

export default function About() {
  return (
    <section id="about" className="about section">
      <div className="container">
        <div className="about-grid">
          <div className="about-image-container animate-fade-in delay-100">
            <div className="about-image-wrapper">
              <img src="/founder.webp" alt="Marcos Thomassen Povoa" className="about-photo" />
            </div>
          </div>
          
          <div className="about-content animate-fade-in-up delay-200">
            <div className="badge">About Us</div>
            <h2 className="section-title">
              Driven by <span className="text-gradient">Experience</span>
            </h2>
            
            <div className="leader-info">
              <h3 className="leader-name">Marcos Thomassen Povoa</h3>
              <p className="leader-title">Founder & CEO</p>
            </div>
            
            <p className="about-text">
              Marcos brings over a decade of experience in international sales, strategic growth, and cross-cultural business development across Europe and Latin America. With an MBA and deep expertise in AI compliance, he founded Stormberry to bridge the gap between visionary strategy and operational excellence.
            </p>
            <div className="experience-badge">
              <span className="years">10+</span>
              <span className="text">Years Experience</span>
            </div>
            
            <div className="languages-section mt-4 mb-4">
              <p className="languages-text" style={{ color: 'var(--text-primary)', fontSize: '1.1rem', fontWeight: '500' }}>
                Global Consulting & Training available in: English, Norwegian, Portuguese and French.
              </p>
            </div>
            
            <div className="about-actions mt-4">
              <a href={siteConfig.social.linkedin} target="_blank" rel="noopener noreferrer" className="btn btn-outline linkedin-btn">
                <Linkedin size={20} /> Connect on LinkedIn
              </a>
              <a href="#contact" className="btn btn-primary">
                Let's Talk <ArrowRight size={18} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
