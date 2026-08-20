import React, { useEffect, useRef } from 'react';
import { Trophy, Award, Sparkles, X, ArrowRight, Share2, Flame, Heart } from 'lucide-react';
import { PriceRevealAnimation } from '../common/PriceRevealAnimation';
import { formatCurrency } from '../../utils/formatters';

interface GoalCelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  goalData: any;
}

/**
 * High-Energy Full-Screen Goal Achievement Celebration Modal
 * Featuring dynamic canvas fireworks, confetti physics, Web Audio fanfare, and Gujarati victory message
 */
export const GoalCelebrationModal: React.FC<GoalCelebrationModalProps> = ({
  isOpen,
  onClose,
  goalData
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const currentMonth = goalData?.current_month;
  const targetAmount = Number(currentMonth?.target) || 0;
  const achievedAmount = Number(currentMonth?.achieved) || 0;
  const achievedPct = currentMonth?.achieved_percent || 100;
  const surplus = Math.max(0, achievedAmount - targetAmount);
  const monthName = currentMonth?.month_name || 'This Month';

  // 1. Web Audio Fanfare / Victory Chimes (100% Offline, Zero external asset dependency)
  const playVictoryFanfare = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      const notes = [
        { freq: 523.25, time: 0.0, dur: 0.15 }, // C5
        { freq: 659.25, time: 0.15, dur: 0.15 }, // E5
        { freq: 783.99, time: 0.30, dur: 0.20 }, // G5
        { freq: 1046.50, time: 0.50, dur: 0.60 } // C6 (High sustained winning chord)
      ];

      notes.forEach(({ freq, time, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + time);

        gain.gain.setValueAtTime(0.01, ctx.currentTime + time);
        gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + time + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + time + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + time);
        osc.stop(ctx.currentTime + time + dur);
      });
    } catch (e) {
      // Audio context might be blocked by browser policy until interaction
    }
  };

  // 2. High-FPS Multi-Colored Confetti & Fireworks Particle Engine
  useEffect(() => {
    if (!isOpen) return;

    playVictoryFanfare();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6', '#ef4444', '#ffd700', '#06b6d4'];
    const particles: any[] = [];

    // Create 200 confetti streamers
    for (let i = 0; i < 220; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * -canvas.height * 0.8,
        w: Math.random() * 12 + 6,
        h: Math.random() * 8 + 4,
        vx: (Math.random() - 0.5) * 4,
        vy: Math.random() * 4 + 3,
        rot: Math.random() * 360,
        vRot: (Math.random() - 0.5) * 8,
        color: colors[Math.floor(Math.random() * colors.length)],
        opacity: Math.random() * 0.5 + 0.5
      });
    }

    // Fireworks bursts
    const fireworks: any[] = [];
    const createFirework = (x: number, y: number) => {
      const color = colors[Math.floor(Math.random() * colors.length)];
      for (let i = 0; i < 45; i++) {
        const angle = (Math.PI * 2 * i) / 45;
        const speed = Math.random() * 5 + 2;
        fireworks.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color,
          alpha: 1,
          decay: Math.random() * 0.02 + 0.015,
          size: Math.random() * 3 + 2
        });
      }
    };

    // Trigger initial 3 fireworks
    createFirework(canvas.width * 0.25, canvas.height * 0.3);
    createFirework(canvas.width * 0.75, canvas.height * 0.35);
    createFirework(canvas.width * 0.5, canvas.height * 0.2);

    let frameCount = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frameCount++;

      // Periodically trigger new fireworks
      if (frameCount % 40 === 0) {
        createFirework(
          Math.random() * (canvas.width * 0.7) + canvas.width * 0.15,
          Math.random() * (canvas.height * 0.4) + 80
        );
      }

      // Draw confetti
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vRot;

        if (p.y > canvas.height) {
          p.y = -20;
          p.x = Math.random() * canvas.width;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rot * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });

      // Draw fireworks
      for (let i = fireworks.length - 1; i >= 0; i--) {
        const f = fireworks[i];
        f.x += f.vx;
        f.y += f.vy;
        f.vy += 0.05; // gravity
        f.alpha -= f.decay;

        if (f.alpha <= 0) {
          fireworks.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2);
        ctx.fillStyle = f.color;
        ctx.globalAlpha = f.alpha;
        ctx.shadowBlur = 8;
        ctx.shadowColor = f.color;
        ctx.fill();
        ctx.restore();
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    const handleResize = () => {
      if (!canvasRef.current) return;
      canvasRef.current.width = window.innerWidth;
      canvasRef.current.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(10, 15, 29, 0.92)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100000,
      padding: '20px',
      overflow: 'hidden'
    }}>
      {/* Dynamic Celebration Particles Canvas */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 1
        }}
      />

      <style>{`
        @keyframes sunburstRotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes trophyBounceGlow {
          0% { transform: scale(0.9) translateY(0); filter: drop-shadow(0 0 15px rgba(251, 191, 36, 0.6)); }
          50% { transform: scale(1.08) translateY(-8px); filter: drop-shadow(0 0 35px rgba(251, 191, 36, 0.9)); }
          100% { transform: scale(1) translateY(0); filter: drop-shadow(0 0 20px rgba(251, 191, 36, 0.7)); }
        }
        @keyframes popCardIn {
          0% { transform: scale(0.7) translateY(40px); opacity: 0; }
          60% { transform: scale(1.04) translateY(-10px); opacity: 1; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        .sunburst-bg {
          animation: sunburstRotate 20s linear infinite;
        }
        .trophy-glow {
          animation: trophyBounceGlow 2.5s ease-in-out infinite alternate;
        }
        .celebration-card-pop {
          animation: popCardIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* Main Celebration Center Card */}
      <div
        className="celebration-card-pop"
        style={{
          position: 'relative',
          zIndex: 10,
          background: 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)',
          border: '2.5px solid #fbbf24',
          borderRadius: '24px',
          padding: '36px 32px',
          maxWidth: '680px',
          width: '100%',
          boxShadow: '0 25px 60px -12px rgba(251, 191, 36, 0.4), 0 0 80px rgba(16, 185, 129, 0.2)',
          textAlign: 'center',
          color: '#ffffff',
          overflow: 'hidden'
        }}
      >
        {/* Sunburst Golden Rays Background */}
        <div
          className="sunburst-bg"
          style={{
            position: 'absolute',
            top: '-150px',
            left: '50%',
            marginLeft: '-250px',
            width: '500px',
            height: '500px',
            background: 'radial-gradient(circle, rgba(251, 191, 36, 0.18) 0%, rgba(251, 191, 36, 0) 70%)',
            pointerEvents: 'none',
            zIndex: 0
          }}
        />

        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'rgba(255, 255, 255, 0.12)',
            border: 'none',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#cbd5e1',
            cursor: 'pointer',
            zIndex: 20
          }}
        >
          <X size={18} />
        </button>

        {/* Big Golden Trophy Winner Icon */}
        <div style={{ position: 'relative', zIndex: 2, marginBottom: '14px' }}>
          <div
            className="trophy-glow"
            style={{
              display: 'inline-flex',
              padding: '22px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)',
              border: '4px solid #fef08a',
              boxShadow: '0 10px 30px rgba(245, 158, 11, 0.5)'
            }}
          >
            <Trophy size={54} color="#ffffff" strokeWidth={2.2} />
          </div>
        </div>

        {/* Winning Typography */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(245, 158, 11, 0.25)',
            border: '1.5px solid #fbbf24',
            color: '#fef08a',
            padding: '4px 16px',
            borderRadius: '20px',
            fontSize: '0.82rem',
            fontWeight: 900,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: '10px'
          }}>
            <Sparkles size={15} /> 🏆 WINNING MOMENT REACHED!
          </div>

          <h1 style={{
            fontSize: '2.3rem',
            fontWeight: 900,
            margin: '0 0 6px 0',
            background: 'linear-gradient(90deg, #fef08a 0%, #f59e0b 50%, #34d399 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.02em',
            lineHeight: 1.15
          }}>
            CONGRATULATIONS!
          </h1>

          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc', margin: '0 0 10px 0' }}>
            🎯 {monthName.toUpperCase()} SALES TARGET COMPLETED ({achievedPct}%)!
          </h2>

          <p style={{
            fontSize: '0.88rem',
            color: '#94a3b8',
            maxWidth: '520px',
            margin: '0 auto 20px auto',
            lineHeight: 1.5
          }}>
            વ્યવસાયમાં નવી ઐતિહાસિક સિદ્ધિ! <strong>{goalData?.business_name || 'Matuki Sweets'}</strong> ટીમ દ્વારા 
            {' '}{monthName} મહિનાનો વેચાણ લક્ષ્યાંક સફળતાપૂર્વક સિદ્ધ કરવામાં આવ્યો છે!
          </p>

          {/* Achievement Figures Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
            background: 'rgba(15, 23, 42, 0.75)',
            border: '1.5px solid rgba(251, 191, 36, 0.3)',
            borderRadius: '16px',
            padding: '16px 14px',
            marginBottom: '24px'
          }}>
            {/* Target */}
            <div>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>
                🎯 Target Set
              </span>
              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#cbd5e1', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                {formatCurrency(targetAmount)}
              </div>
            </div>

            {/* Achieved */}
            <div style={{ borderLeft: '1px solid rgba(255,255,255,0.1)', borderRight: '1px solid rgba(255,255,255,0.1)', padding: '0 8px' }}>
              <span style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: 900, textTransform: 'uppercase' }}>
                🔥 Total Achieved
              </span>
              <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#34d399', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                <PriceRevealAnimation value={achievedAmount} color="#34d399" showDeltaBadge={false} />
              </div>
            </div>

            {/* Surplus */}
            <div>
              <span style={{ fontSize: '0.72rem', color: '#fbbf24', fontWeight: 800, textTransform: 'uppercase' }}>
                🚀 Surplus Bonus
              </span>
              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#fbbf24', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                +{formatCurrency(surplus)}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={onClose}
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#ffffff',
                border: 'none',
                padding: '12px 28px',
                borderRadius: '12px',
                fontSize: '0.95rem',
                fontWeight: 900,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 20px rgba(16, 185, 129, 0.45)',
                transition: 'transform 0.15s ease'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.03)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              🎊 Celebrate & Keep Winning! 🚀
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
