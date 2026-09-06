'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface NavbarProps {
  onOpenDeclareModal: () => void;
  isLoaded?: boolean;
}

export function Navbar({ onOpenDeclareModal, isLoaded = true }: NavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 24) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (mobileMenuOpen) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    }
    return () => {
      if (typeof document !== 'undefined') {
        document.body.style.overflow = '';
      }
    };
  }, [mobileMenuOpen]);

  const handleScrollTo = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    const target = document.getElementById(targetId);
    if (!target) return;

    const startPos = window.pageYOffset;
    const targetRect = target.getBoundingClientRect();
    const targetPos = targetRect.top + window.pageYOffset - 80;
    const distance = targetPos - startPos;
    const duration = 1000;
    let startTime: number | null = null;

    const easeInOutCubic = (t: number) => {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    };

    const animateScroll = (currentTime: number) => {
      if (startTime === null) startTime = currentTime;
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = easeInOutCubic(progress);

      window.scrollTo(0, startPos + distance * ease);

      if (elapsed < duration) {
        requestAnimationFrame(animateScroll);
      }
    };

    requestAnimationFrame(animateScroll);
  };

  return (
    <>
      <nav className={`studio-nav ${isScrolled ? 'scrolled' : ''} ${isLoaded ? 'revealed' : 'initial'}`}>
        <Link href="/" className="studio-logo" onClick={() => setMobileMenuOpen(false)}>
          <span className="studio-logo-mark" />
          <span>EDITH</span>
        </Link>

        {/* Desktop nav links */}
        <div className="studio-nav-links">
          <a 
            href="#integrations" 
            onClick={(e) => handleScrollTo(e, 'integrations')} 
            className="studio-nav-link"
          >
            Integrations
          </a>
          <a 
            href="#voices" 
            onClick={(e) => handleScrollTo(e, 'voices')} 
            className="studio-nav-link"
          >
            AI Personas
          </a>
          <a 
            href="#incidents" 
            onClick={(e) => handleScrollTo(e, 'incidents')} 
            className="studio-nav-link"
          >
            Live Incidents
          </a>
          <a 
            href="#architecture" 
            onClick={(e) => handleScrollTo(e, 'architecture')} 
            className="studio-nav-link"
          >
            Architecture
          </a>
        </div>

        <div className="studio-nav-actions">
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              onOpenDeclareModal();
            }}
            className="btn-cobalt nav-cta-btn"
            title="Declare new outage incident"
          >
            <span className="nav-cta-text-full">DECLARE INCIDENT</span>
            <span className="nav-cta-text-short">DECLARE</span>
            <span className="nav-arrow" style={{ fontSize: 14 }}>→</span>
          </button>

          {/* Mobile hamburger button */}
          <button
            type="button"
            className={`studio-hamburger ${mobileMenuOpen ? 'open' : ''}`}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
          >
            <span className="hamburger-line" />
            <span className="hamburger-line" />
            <span className="hamburger-line" />
          </button>
        </div>
      </nav>

      {/* Mobile Drawer / Overlay */}
      <div 
        className={`studio-mobile-drawer ${mobileMenuOpen ? 'open' : ''}`}
        aria-hidden={!mobileMenuOpen}
      >
        <div className="mobile-drawer-backdrop" onClick={() => setMobileMenuOpen(false)} />
        <div className="mobile-drawer-content">
          <div className="mobile-drawer-header">
            <div className="studio-logo">
              <span className="studio-logo-mark" />
              <span>EDITH</span>
            </div>
            <button
              type="button"
              className="mobile-drawer-close"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close navigation"
            >
              ✕
            </button>
          </div>

          <div className="mobile-drawer-nav">
            <a 
              href="#integrations" 
              onClick={(e) => handleScrollTo(e, 'integrations')} 
              className="mobile-nav-item"
            >
              <span className="mobile-nav-num">01</span>
              <span>Integrations &amp; Telemetry</span>
            </a>
            <a 
              href="#voices" 
              onClick={(e) => handleScrollTo(e, 'voices')} 
              className="mobile-nav-item"
            >
              <span className="mobile-nav-num">02</span>
              <span>AI Personas &amp; Voices</span>
            </a>
            <a 
              href="#incidents" 
              onClick={(e) => handleScrollTo(e, 'incidents')} 
              className="mobile-nav-item"
            >
              <span className="mobile-nav-num">03</span>
              <span>Live Active Incidents</span>
            </a>
            <a 
              href="#architecture" 
              onClick={(e) => handleScrollTo(e, 'architecture')} 
              className="mobile-nav-item"
            >
              <span className="mobile-nav-num">04</span>
              <span>Platform Architecture</span>
            </a>
            <Link 
              href="/incidents"
              onClick={() => setMobileMenuOpen(false)}
              className="mobile-nav-item"
            >
              <span className="mobile-nav-num">05</span>
              <span>Incident Directory →</span>
            </Link>
          </div>

          <div className="mobile-drawer-footer">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenDeclareModal();
              }}
              className="btn-cobalt"
              style={{ width: '100%', justifyContent: 'center', padding: '12px 20px' }}
            >
              <span>+ DECLARE INCIDENT</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
