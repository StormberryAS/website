// src/App.jsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LanguageRouter from './components/LanguageRouter';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Services from './components/Services';
import AiDirective from './components/AiDirective';
import About from './components/About';
import Contact from './components/Contact';
import Footer from './components/Footer';
import NotFound from './components/NotFound';
import './App.css';

function MainSite() {
  return (
    <div className="app-container">
      <Navbar />
      <main>
        <Hero />
        <Services />
        <AiDirective />
        <About />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/en" replace />} />
      <Route
        path="/:lang"
        element={
          <LanguageRouter>
            <MainSite />
          </LanguageRouter>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
