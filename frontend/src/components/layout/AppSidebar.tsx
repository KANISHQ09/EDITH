import React from 'react';
import Link from 'next/link';
import { useIncidentStore } from '@/stores/incidentStore';

export type NavItemKey =
  | 'overview'
  | 'call'
  | 'transcripts'
  | 'timeline'
  | 'evidence'
  | 'hypotheses'
  | 'decisions'
  | 'actions'
  | 'reports'
  | 'team';

interface AppSidebarProps {
  activeNav?: NavItemKey;
  onSelectNav?: (key: NavItemKey) => void;
}

export function AppSidebar({ activeNav = 'overview', onSelectNav }: AppSidebarProps) {
  const { isSidebarCollapsed, toggleSidebarCollapse } = useIncidentStore();

  const navItems: { key: NavItemKey; label: string; icon: React.ReactNode; isLive?: boolean }[] = [
    {
      key: 'overview',
      label: 'Overview',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ),
    },
    {
      key: 'call',
      label: 'Incident Room Call',
      isLive: true,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.934a.5.5 0 0 0-.777-.416L16 11" />
          <rect width="14" height="12" x="2" y="6" rx="2" />
        </svg>
      ),
    },
    {
      key: 'transcripts',
      label: 'Transcripts',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="22" />
        </svg>
      ),
    },
    {
      key: 'timeline',
      label: 'Timeline',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
    },
    {
      key: 'evidence',
      label: 'Evidence',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      ),
    },
    {
      key: 'hypotheses',
      label: 'Hypotheses',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
      ),
    },
    {
      key: 'decisions',
      label: 'Decisions',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
          <polyline points="14 2 14 8 20 8" />
          <path d="m9 15 2 2 4-4" />
        </svg>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
      ),
    },
    {
      key: 'reports',
      label: 'Reports',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
          <path d="M6 6h10" />
          <path d="M6 10h10" />
          <path d="M6 14h6" />
        </svg>
      ),
    },
    {
      key: 'team',
      label: 'Team',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
  ];

  return (
    <aside className={`vaic-sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
      <div>
        {/* Logo & Brand Header */}
        <Link href="/" className="vaic-logo-area" title="Return to Incidents Overview">
          <div className="vaic-logo-icon">
            <svg width="32" height="32" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 3L32 10.5V25.5L18 33L4 25.5V10.5L18 3Z" fill="#EFF6FF" stroke="#2563EB" strokeWidth="2" />
              <path d="M18 3L18 33" stroke="#3B82F6" strokeWidth="1.5" strokeDasharray="2 2" />
              <path d="M4 10.5L32 25.5" stroke="#3B82F6" strokeWidth="1.5" />
              <path d="M4 25.5L32 10.5" stroke="#3B82F6" strokeWidth="1.5" />
              <circle cx="18" cy="18" r="4" fill="#2563EB" />
            </svg>
          </div>
          {!isSidebarCollapsed && (
            <div>
              <div className="vaic-logo-text-title">EDITH</div>
              <div className="vaic-logo-text-sub">Virtual AI Co-Investigator</div>
            </div>
          )}
        </Link>

        {/* Main Navigation List */}
        <ul className="vaic-nav-list">
          {navItems.map((item) => {
            const isActive = activeNav === item.key;
            return (
              <li key={item.key}>
                <button
                  type="button"
                  onClick={() => onSelectNav && onSelectNav(item.key)}
                  className={`vaic-nav-item ${isActive ? 'active' : ''}`}
                  title={isSidebarCollapsed ? item.label : undefined}
                >
                  <span className="vaic-nav-icon">{item.icon}</span>
                  {!isSidebarCollapsed && (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <span>{item.label}</span>
                      {item.isLive && (
                        <span style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: '#16A34A',
                          boxShadow: '0 0 6px #16A34A',
                        }} />
                      )}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Bottom Controls */}
      <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <button
          type="button"
          className="vaic-nav-item"
          title={isSidebarCollapsed ? 'Settings' : undefined}
          onClick={() => alert('Settings: VAIC Co-Pilot configured with Claude 3.5 Sonnet & Whisper V3 ASR')}
        >
          <span className="vaic-nav-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </span>
          {!isSidebarCollapsed && <span>Settings</span>}
        </button>

        <button
          type="button"
          className="vaic-nav-item"
          onClick={toggleSidebarCollapse}
          title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          <span className="vaic-nav-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isSidebarCollapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}>
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </span>
          {!isSidebarCollapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
