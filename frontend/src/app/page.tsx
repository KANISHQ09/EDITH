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

  useEffect(() => {
    async function loadIncidents() {
      try {
        const res = await fetch('/api/v1/incidents');
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
      <Preloader />

      {/* Studio Navbar */}
      <Navbar onOpenDeclareModal={() => setIsDeclareModalOpen(true)} />

      <main>
        {/* Veyra-style Hero Section with 3D Voice Orb */}
        <HeroSection primaryIncidentId={defaultIncidentId} />

        {/* Interactive Integrations & Telemetry Grid */}
        <IntegrationsSection />

        {/* Meet the AI Personas & Voice Showcase */}
        <VoicesSection />

        {/* Live Active Incidents Console */}
        <ActiveIncidentsConsole
          incidents={incidents}
          onOpenDeclareModal={() => setIsDeclareModalOpen(true)}
        />

        {/* Platform Architecture & Veyra In Action */}
        <ArchitectureSection />
      </main>

      {/* Signature Swiss Footer with Full-Bleed Cobalt Block */}
      <LandingFooter />

      {/* Modal to declare new incident */}
      <DeclareIncidentModal
        isOpen={isDeclareModalOpen}
        onClose={() => setIsDeclareModalOpen(false)}
        onIncidentCreated={(newInc) => setIncidents(prev => [newInc, ...prev])}
      />
    </div>
  );
}
