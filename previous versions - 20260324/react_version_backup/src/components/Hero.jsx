import React from 'react';
import { ArrowRight } from 'lucide-react';
import './Hero.css';

const Hero = () => {
  return (
    <section className="hero" id="home">
      <div className="hero-background">
        <div className="glow glow-1"></div>
        <div className="glow glow-2"></div>
      </div>
      
      <div className="container hero-container">
        <div className="hero-content animate-fade-in-up">
          <div className="badge">Next-Generation Consulting</div>
          <h1 className="hero-title">
            Transform Your Business With <br />
            <span className="text-gradient">Strategic Excellence</span>
          </h1>
          <p className="hero-subtitle delay-100">
            Smarter sales. Global culture. AI-driven strategy.
          </p>
          <div className="hero-actions delay-200">
            <a href="#contact" className="btn btn-primary">
              Partner With Us <ArrowRight size={18} />
            </a>
            <a href="#services" className="btn btn-outline">
              Explore Services
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
