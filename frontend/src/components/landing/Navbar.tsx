'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface NavbarProps {
  onOpenDeclareModal: () => void;
}

export function Navbar({ onOpenDeclareModal }: NavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);

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

  const handleScrollTo = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (!target) return;

    const startPos = window.pageYOffset;
    const targetRect = target.getBoundingClientRect();
    const targetPos = targetRect.top + window.pageYOffset - 80;
    const distance = targetPos - startPos;
    const duration = 1200; // 1.2s luxurious, smooth scroll
    let startTime: number | null = null;

    // Cubic bezier ease-in-out curve
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
    <nav className={`studio-nav ${isScrolled ? 'scrolled' : ''}`}>
      <Link href="/" className="studio-logo">
        <span className="studio-logo-mark" />
        <span>EDITH</span>
      </Link>

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

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <button
          onClick={onOpenDeclareModal}
          className="btn-cobalt"
          title="Declare new outage incident"
        >
          <span>DECLARE INCIDENT</span>
          <span style={{ fontSize: 14 }}>→</span>
        </button>
      </div>
    </nav>
  );
}
