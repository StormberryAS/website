import React from 'react';
import { ShieldCheck, BookOpen, AlertCircle, Cpu } from 'lucide-react';
import './AiDirective.css';

export default function AiDirective() {
  return (
    <section id="ai-directive" className="ai-directive section">
      <div className="container">
        <div className="ai-grid">
          <div className="ai-content animate-fade-in-up">
            <div className="badge">SPECIALISED CORPORATE TRAINING</div>
            <h2 className="section-title">
              EU AI Act Article 4 <br />
              <span className="text-gradient">AI Literacy & Compliance Training</span>
            </h2>
            <p className="ai-desc">
              The EU Artificial Intelligence Act (Article 4) legally mandates that all organisations deploying AI systems must ensure a sufficient level of AI literacy among their staff. Protect your enterprise from regulatory liability and empower your workforce to operate AI tools securely with our certified compliance programme.
            </p>
            
            <ul className="ai-features">
              <li>
                <ShieldCheck className="feature-icon" size={24} />
                <div>
                  <h4>Regulatory Compliance</h4>
                  <p>Fulfill your legal obligations as an AI deployer under the EU AI Act, mitigating institutional risk and avoiding severe regulatory penalties.</p>
                </div>
              </li>
              <li>
                <BookOpen className="feature-icon" size={24} />
                <div>
                  <h4>AI Literacy Fundamentals</h4>
                  <p>Equip your teams with the essential knowledge to utilise tools like Copilot and ChatGPT safely, ensuring they understand prompt boundaries and hallucination risks.</p>
                </div>
              </li>
              <li>
                <AlertCircle className="feature-icon" size={24} />
                <div>
                  <h4>Corporate Risk Mitigation</h4>
                  <p>Prevent sensitive data leaks and address the ethical, legal, and security implications of integrating generative AI into daily enterprise workflows.</p>
                </div>
              </li>
            </ul>
            
            <a href="#contact" className="btn btn-primary mt-4">
              Schedule a Compliance Briefing
            </a>
          </div>
          
          <div className="ai-visual animate-fade-in-up delay-200">
            <div className="glass-panel visual-card">
              <div className="pulse-circle"></div>
              <ShieldCheck className="visual-icon" size={80} />
              <h3>Documented Compliance</h3>
              <p>Receive formal certification of AI literacy training for your participating staff, satisfying EU regulatory audit requirements.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
