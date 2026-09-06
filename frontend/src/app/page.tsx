'use client';

import { useState, useEffect } from 'react';
import { Preloader } from '@/components/landing/Preloader';
import { Navbar } from '@/components/landing/Navbar';
import { HeroSection } from '@/components/landing/HeroSection';
import { IntegrationsSection } from '@/components/landing/IntegrationsSection';
import { VoicesSection } from '@/components/landing/VoicesSection';
import { ArchitectureSection } from '@/components/landing/ArchitectureSection';
import { ActiveIncidentsConsole } from '@/components/landing/ActiveIncidentsConsole';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { DeclareIncidentModal } from '@/components/landing/DeclareIncidentModal';
import { apiFetch } from '@/lib/api';

interface IncidentSummary {
  id: string;
  title: string;
  severity: 'P1' | 'P2' | 'P3' | 'P4';
  status: 'ACTIVE' | 'RESOLVED' | 'MITIGATED';
  start_ts: string;
  affected_systems: string[];
}

export default function Home() {
  const [incidents, setIncidents] = useState<IncidentSummary[]>([]);
  const [isDeclareModalOpen, setIsDeclareModalOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Prevent browser from auto-scrolling down on refresh/load
    if (typeof window !== 'undefined') {
      if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
      }
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });

      // If URL has an anchor hash, clear it so browser does not jump to that section on reload
      if (window.location.hash) {
        history.replaceState(null, '', window.location.pathname);
      }
    }

    async function loadIncidents() {
      try {
        const res = await apiFetch('/api/v1/incidents');
        if (res.ok) {
          const data = await res.json();
          setIncidents(data.data || []);
        }
      } catch (err) {
        console.error('Failed to load incidents for landing page:', err);
      }
    }
    loadIncidents();
  }, []);

  const defaultIncidentId = incidents[0]?.id || '00000000-0000-0000-0000-000000000010';

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--studio-bg)',
      color: 'var(--studio-text)',
      fontFamily: 'var(--font-sans)',
      position: 'relative',
    }}>
      {/* Studio Preloader from design.mp4 */}
      <Preloader onComplete={() => setIsLoaded(true)} />

      {/* Studio Navbar - rendered directly at root level so position: fixed stays persistent on scroll */}
      <Navbar isLoaded={isLoaded} onOpenDeclareModal={() => setIsDeclareModalOpen(true)} />

      <main>
        {/* Veyra-style Hero Section with 3D Voice Orb */}
        <div className={`landing-reveal-item landing-reveal-hero ${isLoaded ? 'revealed' : ''}`}>
          <HeroSection primaryIncidentId={defaultIncidentId} />
        </div>

        {/* Interactive Integrations & Telemetry Grid */}
        <div className={`landing-reveal-item landing-reveal-integrations ${isLoaded ? 'revealed' : ''}`}>
          <IntegrationsSection />
        </div>

        {/* Meet the AI Personas & Voice Showcase */}
        <div className={`landing-reveal-item landing-reveal-voices ${isLoaded ? 'revealed' : ''}`}>
          <VoicesSection />
        </div>

        {/* Live Active Incidents Console */}
        <div className={`landing-reveal-item landing-reveal-incidents ${isLoaded ? 'revealed' : ''}`}>
          <ActiveIncidentsConsole
            incidents={incidents}
            onOpenDeclareModal={() => setIsDeclareModalOpen(true)}
            onIncidentDeleted={(deletedId) => {
              setIncidents(prev => prev.filter(i => i.id !== deletedId));
            }}
          />
        </div>

        {/* Platform Architecture & Veyra In Action */}
        <div className={`landing-reveal-item landing-reveal-arch ${isLoaded ? 'revealed' : ''}`}>
          <ArchitectureSection />
        </div>
      </main>

      {/* Signature Swiss Footer with Full-Bleed Cobalt Block */}
      <div className={`landing-reveal-item landing-reveal-footer ${isLoaded ? 'revealed' : ''}`}>
        <LandingFooter />
      </div>

      {/* Modal to declare new incident */}
      <DeclareIncidentModal
        isOpen={isDeclareModalOpen}
        onClose={() => setIsDeclareModalOpen(false)}
        onIncidentCreated={(newInc) => setIncidents(prev => [newInc, ...prev])}
      />
    </div>
  );
}
