import React, { useState, useRef } from 'react';
import {
  ExternalLink,
  RefreshCw,
  Maximize2,
  Minimize2,
  KeyRound,
  ShieldCheck,
  Building2,
  Check,
  Globe
} from 'lucide-react';

const LIVE_ATTENDANCE_URL = 'https://matuki-attendance-c5q6.vercel.app/';

export const AttendanceView: React.FC = () => {
  const [iframeKey, setIframeKey] = useState<number>(Date.now());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [copiedPin, setCopiedPin] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleCopyPin = (pin: string, label: string) => {
    navigator.clipboard.writeText(pin);
    setCopiedPin(label);
    setTimeout(() => setCopiedPin(null), 2500);
  };

  const handleRefresh = () => {
    setIsLoading(true);
    setIframeKey(Date.now());
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  return (
    <div 
      ref={containerRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: isFullscreen ? '100vh' : 'calc(100vh - 84px)',
        width: '100%',
        background: '#0f172a',
        borderRadius: isFullscreen ? '0px' : '12px',
        overflow: 'hidden',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.3)',
        border: '1px solid rgba(255, 255, 255, 0.08)'
      }}
    >
      {/* Top Controls Header Bar */}
      <div 
        style={{
          background: 'linear-gradient(90deg, #1e293b 0%, #0f172a 100%)',
          padding: '10px 16px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px'
        }}
      >
        {/* Left: Title & Cloud Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            color: '#ffffff',
            padding: '7px 9px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(59, 130, 246, 0.4)'
          }}>
            <Globe size={18} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 900, color: '#ffffff', margin: 0 }}>
                👥 Matuki Attendance & Salary System
              </h2>
              <span style={{
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#34d399',
                border: '1px solid rgba(52, 211, 153, 0.3)',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '0.68rem',
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34d399', display: 'inline-block' }} />
                LIVE VERCEL CLOUD
              </span>
            </div>
            <p style={{ fontSize: '0.72rem', color: '#94a3b8', margin: '2px 0 0 0' }}>
              Original Live App: <strong style={{ color: '#38bdf8' }}>matuki-attendance-c5q6.vercel.app</strong>
            </p>
          </div>
        </div>

        {/* Middle: Quick PIN Reference & 1-Click Copy Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', marginRight: '4px' }}>
            🔑 Quick PINs:
          </span>

          {/* Factory PIN (3333) */}
          <button
            type="button"
            onClick={() => handleCopyPin('3333', 'Factory')}
            style={{
              padding: '4px 9px',
              borderRadius: '6px',
              border: '1px solid #f59e0b',
              background: copiedPin === 'Factory' ? '#f59e0b' : 'rgba(245, 158, 11, 0.12)',
              color: copiedPin === 'Factory' ? '#ffffff' : '#fbbf24',
              fontSize: '0.74rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.15s ease'
            }}
            title="Click to copy Factory PIN 3333"
          >
            {copiedPin === 'Factory' ? <Check size={12} /> : <Building2 size={12} />}
            Factory: <strong>3333</strong>
          </button>

          {/* Paresh PIN (6957) */}
          <button
            type="button"
            onClick={() => handleCopyPin('6957', 'Paresh')}
            style={{
              padding: '4px 8px',
              borderRadius: '6px',
              border: '1px solid rgba(59, 130, 246, 0.4)',
              background: copiedPin === 'Paresh' ? '#3b82f6' : 'rgba(59, 130, 246, 0.1)',
              color: copiedPin === 'Paresh' ? '#ffffff' : '#60a5fa',
              fontSize: '0.74rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
            title="Click to copy Paresh PIN 6957"
          >
            {copiedPin === 'Paresh' ? <Check size={12} /> : <KeyRound size={12} />}
            Paresh: <strong>6957</strong>
          </button>

          {/* Suraj PIN (1234) */}
          <button
            type="button"
            onClick={() => handleCopyPin('1234', 'Suraj')}
            style={{
              padding: '4px 8px',
              borderRadius: '6px',
              border: '1px solid rgba(168, 85, 247, 0.4)',
              background: copiedPin === 'Suraj' ? '#a855f7' : 'rgba(168, 85, 247, 0.1)',
              color: copiedPin === 'Suraj' ? '#ffffff' : '#c084fc',
              fontSize: '0.74rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
            title="Click to copy Suraj PIN 1234"
          >
            {copiedPin === 'Suraj' ? <Check size={12} /> : <KeyRound size={12} />}
            Suraj: <strong>1234</strong>
          </button>

          {/* Master Admin PIN (9999) */}
          <button
            type="button"
            onClick={() => handleCopyPin('9999', 'Admin')}
            style={{
              padding: '4px 8px',
              borderRadius: '6px',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              background: copiedPin === 'Admin' ? '#ef4444' : 'rgba(239, 68, 68, 0.1)',
              color: copiedPin === 'Admin' ? '#ffffff' : '#f87171',
              fontSize: '0.74rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
            title="Click to copy Master Admin PIN 9999"
          >
            {copiedPin === 'Admin' ? <Check size={12} /> : <ShieldCheck size={12} />}
            Admin: <strong>9999</strong>
          </button>
        </div>

        {/* Right: Actions (Refresh, Fullscreen, Open in Browser) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={handleRefresh}
            className="btn btn-secondary btn-sm"
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              color: '#e2e8f0',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              fontSize: '0.74rem',
              padding: '4px 10px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px'
            }}
            title="Reload live attendance frame"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
            Reload
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="btn btn-secondary btn-sm"
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              color: '#e2e8f0',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              fontSize: '0.74rem',
              padding: '4px 10px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px'
            }}
            title={isFullscreen ? 'Exit full screen' : 'Expand full screen'}
          >
            {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          </button>

          <a
            href={LIVE_ATTENDANCE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-sm"
            style={{
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              color: '#ffffff',
              border: 'none',
              fontSize: '0.74rem',
              fontWeight: 800,
              padding: '4px 12px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              textDecoration: 'none',
              borderRadius: '6px',
              boxShadow: '0 2px 6px rgba(2, 132, 199, 0.3)'
            }}
          >
            <ExternalLink size={13} />
            Open in Tab
          </a>
        </div>
      </div>

      {/* Main Interactive Live Iframe Container */}
      <div style={{ position: 'relative', flex: 1, width: '100%', height: '100%', background: '#090d16' }}>
        {isLoading && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.92)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
            gap: '12px'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '3px solid rgba(59, 130, 246, 0.2)',
              borderTopColor: '#3b82f6',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite'
            }} />
            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#f8fafc' }}>
              Connecting to Matuki Live Attendance Server...
            </div>
            <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
              Loading cloud database & PIN authentication interface
            </div>
          </div>
        )}

        <iframe
          key={iframeKey}
          src={LIVE_ATTENDANCE_URL}
          title="Matuki Live Attendance System"
          onLoad={() => setIsLoading(false)}
          allow="camera; microphone; fullscreen; clipboard-read; clipboard-write; geolocation"
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            display: 'block',
            background: '#ffffff'
          }}
        />
      </div>
    </div>
  );
};
