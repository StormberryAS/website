import React from 'react';
import { Target, TrendingUp, Globe2, Cpu } from 'lucide-react';
import './Services.css';

export default function Services() {
  const services = [
    {
      icon: <Target size={32} />,
      title: "Sales Excellence",
      description: "Elevate your sales force with advanced methodologies and high-impact negotiation training designed for modern markets."
    },
    {
      icon: <TrendingUp size={32} />,
      title: "Strategic Growth",
      description: "Data-driven business strategies that align your corporate vision with actionable, measurable outcomes."
    },
    {
      icon: <Globe2 size={32} />,
      title: "Cross-Cultural Communications",
      description: "Bridge global divides with tailored communication training, ensuring your teams thrive in diverse, international environments."
    },
    {
      icon: <Cpu size={32} />,
      title: "Enterprise AI Integration",
      description: "Navigate the complex landscape of AI. We provide strategic consulting to seamlessly integrate artificial intelligence into your workflows."
    }
  ];

  return (
    <section id="services" className="services section">
      <div className="container">
        <div className="section-header animate-fade-in-up">
          <div className="badge">Our Expertise</div>
          <h2 className="section-title">Drive Growth & <span className="text-gradient">Innovation</span></h2>
          <p className="section-subtitle">
            Comprehensive consulting solutions tailored to scale your operations and future-proof your business.
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
