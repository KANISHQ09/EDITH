'use client';

import { useState } from 'react';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportMarkdown: string;
  incidentTitle: string;
}

export function ReportModal({ isOpen, onClose, reportMarkdown, incidentTitle }: ReportModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(reportMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([reportMarkdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ISR-${incidentTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0, 0, 0, 0.75)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: 24,
    }}>
      <div
        className="modal-box"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-panel, #12151c)',
          border: '1px solid var(--border, #2d3340)',
          borderRadius: 12,
          width: '100%',
          maxWidth: 820,
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid var(--border, #2d3340)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary, #fff)' }}>
              📄 Incident Summary Report (ISR)
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted, #8b949e)', marginTop: 2 }}>
              Auto-generated post-mortem synthesized by Gemini 2.5 Flash
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleCopy} className="btn btn-secondary btn-sm" style={{ fontSize: 12 }}>
              {copied ? '✓ Copied' : '📋 Copy Markdown'}
            </button>
            <button onClick={handleDownload} className="btn btn-primary btn-sm" style={{ fontSize: 12 }}>
              ⬇️ Download .md
            </button>
            <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ fontSize: 16 }}>
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{
          padding: 24,
          overflowY: 'auto',
          flex: 1,
          fontFamily: 'var(--font-mono, monospace)',
          fontSize: 13,
          lineHeight: 1.6,
          color: 'var(--text-primary, #c9d1d9)',
          whiteSpace: 'pre-wrap',
          background: 'var(--bg-base, #0d1117)',
        }}>
          {reportMarkdown || 'Generating report...'}
        </div>
      </div>
    </div>
  );
}
