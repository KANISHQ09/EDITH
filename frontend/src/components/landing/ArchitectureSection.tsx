'use client';

import { useState, useEffect } from 'react';

interface ArchitectureStep {
  num: string;
  title: string;
  description: string;
}

const STEPS: ArchitectureStep[] = [
  {
    num: '01',
    title: 'Listens',
    description:
      'EDITH listens naturally to live responder audio streams via Agora RTC, capturing every observation, metric spike, and nuance without forcing engineers into rigid scripts.',
  },
  {
    num: '02',
    title: 'Understands',
    description:
      'It recognizes incident intent, gathers the right context from Datadog and Kubernetes telemetry, isolates speculative theories from confirmed facts, and determines what needs to happen next.',
  },
  {
    num: '03',
    title: 'Acts',
    description:
      'EDITH completes routine actions in real time, from automated canary rollbacks to database read-replica failovers, with strict human-in-the-loop consensus before execution.',
  },
  {
    num: '04',
    title: 'Syncs',
    description:
      'Every outcome is recorded and connected back to your workflow in Slack and PagerDuty, keeping engineering leadership informed and generating instant post-mortem ISR reports.',
  },
];

export function ArchitectureSection() {
  const [activeStep, setActiveStep] = useState(0);

  // Auto-shift to next step continuously every 3.6s
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % STEPS.length);
    }, 3600);

    return () => clearInterval(timer);
  }, []);

  return (
    <section className="landing-section" id="architecture">
      <div className="architecture-box">
        {/* Top Header matching Veyra reference */}
        <div>
          <div className="section-badge">
            How EDITH Works
          </div>
          <h2 className="architecture-heading">
            Built to Understand.<br />
            Ready to Act.
          </h2>
        </div>

        {/* 4 Process Rows */}
        <div className="architecture-rows">
          {STEPS.map((step, idx) => {
            const isActive = activeStep === idx;

            return (
              <div
                key={step.num}
                onClick={() => setActiveStep(idx)}
                className={`architecture-row ${isActive ? 'active' : 'inactive'}`}
              >
                {/* Left side with step number and scanline display typography */}
                <div className="architecture-row-left">
                  <span className="architecture-row-num">
                    {step.num}
                  </span>
                  <span className="architecture-scanline-title">
                    {step.title}
                  </span>
                </div>

                {/* Right side with descriptive narrative */}
                <div className="architecture-row-desc">
                  {step.description}
                </div>

                {/* Active animated progress indicator line */}
                {isActive && (
                  <div key={`progress-${activeStep}`} className="architecture-row-progress" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
