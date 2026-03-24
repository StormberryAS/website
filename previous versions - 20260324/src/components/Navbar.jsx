import React, { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import './Navbar.css';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    document.documentElement.setAttribute('data-theme', 'light');
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleMenu = () => setMobileMenuOpen(!mobileMenuOpen);

  return (
    <nav className={`navbar ${isScrolled ? 'scrolled' : ''}`}>
      <div className="container nav-container">
        <a href="/" className="logo">
          Stormberry<span className="text-gradient">.</span>
        </a>
        
        <div className={`nav-links ${mobileMenuOpen ? 'active' : ''}`}>
          <a href="#services" onClick={() => setMobileMenuOpen(false)}>Services</a>
          <a href="#ai-directive" onClick={() => setMobileMenuOpen(false)}>AI Directive</a>
          <a href="#about" onClick={() => setMobileMenuOpen(false)}>About</a>
          <a href="#contact" className="btn btn-primary nav-btn" onClick={() => setMobileMenuOpen(false)}>Contact Us</a>
        </div>

        <button className="mobile-toggle" onClick={toggleMenu}>
          {mobileMenuOpen ? <X size={24} color="var(--text-primary)" /> : <Menu size={24} color="var(--text-primary)" />}
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
