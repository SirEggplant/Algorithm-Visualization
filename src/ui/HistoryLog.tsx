// src/ui/HistoryLog.tsx
import React, { useRef, useEffect } from 'react';
import type { VisualizationState } from '../core/types';

export interface HistoryEntry {
  step: number;
  action: string;
  state: VisualizationState;
}

interface HistoryLogProps {
  history: HistoryEntry[];
  currentIndex: number;
  onSelect: (index: number) => void;
  isPlaying: boolean;
}

const HistoryLog: React.FC<HistoryLogProps> = ({
  history,
  currentIndex,
  onSelect,
  isPlaying,
}) => {
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the bottom when new entries are added
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [history.length]);

  return (
    <div
      style={{
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        background: '#0f172a',
        borderLeft: '1px solid #1e293b',
        overflow: 'hidden',
        borderRadius: '0 8px 8px 0',
        width: '100%',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid #1e293b',
          background: '#141b2d',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <span style={{ color: '#e2e8f0', fontWeight: 'bold', fontSize: '16px' }}>
          📜 Step History
        </span>
        <span style={{ color: '#64748b', fontSize: '12px' }}>
          {history.length} steps
        </span>
      </div>

      {/* Scrollable Container */}
      <div
        ref={logContainerRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px 0',
          fontFamily: 'monospace',
          fontSize: '13px',
          minHeight: 0,
        }}
      >
        {history.length === 0 ? (
          <div
            style={{
              color: '#475569',
              textAlign: 'center',
              padding: '40px 20px',
              fontSize: '14px',
            }}
          >
            No steps yet.<br />
            Click <span style={{ color: '#38bdf8' }}>Play</span> to start sorting!
          </div>
        ) : (
          history.map((entry, index) => {
            const isActive = index === currentIndex;
            const isPast = index < currentIndex;
            const isFuture = index > currentIndex;

            return (
              <div
                key={entry.step}
                onClick={() => {
                  if (!isPlaying && index !== currentIndex) {
                    onSelect(index);
                  }
                }}
                style={{
                  padding: '6px 16px',
                  margin: '2px 8px',
                  borderRadius: '6px',
                  cursor: isPlaying || index === currentIndex ? 'default' : 'pointer',
                  background: isActive
                    ? 'rgba(56, 189, 248, 0.15)'
                    : isPast
                    ? 'rgba(74, 222, 128, 0.05)'
                    : 'transparent',
                  borderLeft: isActive ? '3px solid #38bdf8' : '3px solid transparent',
                  transition: 'all 0.15s ease',
                  opacity: isFuture ? 0.6 : 1,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  if (!isPlaying && index !== currentIndex) {
                    e.currentTarget.style.background = 'rgba(56, 189, 248, 0.08)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isPlaying && index !== currentIndex) {
                    e.currentTarget.style.background =
                      isPast ? 'rgba(74, 222, 128, 0.05)' : 'transparent';
                  }
                }}
              >
                <span
                  style={{
                    color: isActive ? '#38bdf8' : isPast ? '#94a3b8' : '#64748b',
                    fontWeight: isActive ? 'bold' : 'normal',
                  }}
                >
                  #{entry.step}
                </span>
                <span
                  style={{
                    color: isActive ? '#e2e8f0' : isPast ? '#cbd5e1' : '#64748b',
                    fontSize: '12px',
                    flex: 1,
                    marginLeft: '12px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {entry.action}
                </span>
                {isActive && (
                  <span style={{ color: '#38bdf8', fontSize: '10px' }}>◀</span>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: '8px 16px',
          borderTop: '1px solid #1e293b',
          fontSize: '11px',
          color: '#475569',
          textAlign: 'center',
          flexShrink: 0,
          background: '#0a0e1a',
        }}
      >
        {isPlaying
          ? '⏳ Click Stop to enable history navigation'
          : '💡 Click any step to revert (fast animation)'}
      </div>
    </div>
  );
};

export default HistoryLog;