import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Home } from 'lucide-react';
import './NotFound.css';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="not-found">
      <div className="not-found-background">
        <div className="glow glow-1"></div>
        <div className="glow glow-2"></div>
      </div>
      <div className="container not-found-container">
        <div className="not-found-content animate-fade-in-up">
          <h1 className="not-found-code">
            4<span className="text-gradient">0</span>4
          </h1>
          <h2 className="not-found-title">Page Not Found</h2>
          <p className="not-found-text">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <div className="not-found-actions">
            <button onClick={() => navigate(-1)} className="btn btn-outline">
              <ArrowLeft size={18} /> Go Back
            </button>
            <a href="/" className="btn btn-primary">
              <Home size={18} /> Home
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
