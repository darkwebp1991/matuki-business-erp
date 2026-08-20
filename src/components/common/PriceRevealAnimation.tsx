import React, { useState, useEffect, useRef } from 'react';

interface PriceRevealAnimationProps {
  value: number;
  prefix?: string;
  decimals?: number;
  duration?: number; // duration in ms (e.g. 1000ms)
  className?: string;
  style?: React.CSSProperties;
  color?: string;
  showDeltaBadge?: boolean;
}

/**
 * Car Launch Style Real-Time Price Reveal & Smooth Delta Counter
 * Automatically animates smooth transitions from Old Value -> New Value (e.g. 1,50,000 -> 2,00,000)
 * Never resets to 0 on live auto-refreshes!
 */
export const PriceRevealAnimation: React.FC<PriceRevealAnimationProps> = ({
  value = 0,
  prefix = '₹',
  decimals = 0,
  duration = 1100,
  className = '',
  style = {},
  color,
  showDeltaBadge = true
}) => {
  const targetVal = Number(value) || 0;
  const [displayValue, setDisplayValue] = useState<number>(() => targetVal);
  const [isRevealing, setIsRevealing] = useState<boolean>(false);
  const [hasSettled, setHasSettled] = useState<boolean>(false);
  const [deltaInfo, setDeltaInfo] = useState<{ amount: number; type: 'up' | 'down' } | null>(null);

  const prevValueRef = useRef<number>(targetVal);
  const isInitialMount = useRef<boolean>(true);
  const animFrameRef = useRef<number | null>(null);
  const deltaTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const startVal = prevValueRef.current;
    const target = Number(value) || 0;

    // If on initial mount or value didn't change, just set directly
    if (isInitialMount.current) {
      isInitialMount.current = false;
      // Do initial car launch reveal from 0
      if (target > 0) {
        prevValueRef.current = 0;
      } else {
        setDisplayValue(target);
        prevValueRef.current = target;
        return;
      }
    }

    const diff = target - startVal;
    if (Math.abs(diff) < 0.001) {
      setDisplayValue(target);
      return;
    }

    // Trigger delta badge if changed during live sync
    if (startVal > 0 && Math.abs(diff) >= 1) {
      setDeltaInfo({
        amount: Math.abs(diff),
        type: diff > 0 ? 'up' : 'down'
      });

      if (deltaTimerRef.current) clearTimeout(deltaTimerRef.current);
      deltaTimerRef.current = setTimeout(() => {
        setDeltaInfo(null);
      }, 2800);
    }

    const startTime = performance.now();
    setIsRevealing(true);
    setHasSettled(false);

    // Easing: Smooth Cubic Out for precise rolling odometer
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const updateCounter = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutCubic(progress);

      const current = startVal + (target - startVal) * easedProgress;
      setDisplayValue(current);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(updateCounter);
      } else {
        setDisplayValue(target);
        setIsRevealing(false);
        setHasSettled(true);
        prevValueRef.current = target;
      }
    };

    animFrameRef.current = requestAnimationFrame(updateCounter);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [value, duration]);

  // Clean up delta timer on unmount
  useEffect(() => {
    return () => {
      if (deltaTimerRef.current) clearTimeout(deltaTimerRef.current);
    };
  }, []);

  // Format with Indian currency commas (e.g. 1,25,000)
  const formatIndianNumber = (num: number) => {
    const rounded = decimals > 0 ? num.toFixed(decimals) : Math.round(num).toString();
    const parts = rounded.split('.');
    let intPart = parts[0];
    const decPart = parts.length > 1 ? '.' + parts[1] : '';

    const isNegative = intPart.startsWith('-');
    if (isNegative) intPart = intPart.slice(1);

    if (intPart.length > 3) {
      const lastThree = intPart.slice(-3);
      const rest = intPart.slice(0, -3);
      intPart = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
    }

    return (isNegative ? '-' : '') + intPart + decPart;
  };

  return (
    <span
      className={`price-reveal-container ${className} ${hasSettled ? 'settled-pulse' : ''}`}
      style={{
        display: 'inline-flex',
        alignItems: 'baseline',
        fontFamily: 'var(--font-mono, monospace)',
        fontWeight: 900,
        position: 'relative',
        letterSpacing: '-0.02em',
        color: color || style.color || 'inherit',
        ...style
      }}
    >
      <style>{`
        @keyframes revealShimmer {
          0% { filter: brightness(1.25) drop-shadow(0 0 6px rgba(250, 204, 21, 0.5)); transform: scale(1.03); }
          50% { filter: brightness(1.1) drop-shadow(0 0 3px rgba(52, 211, 153, 0.3)); transform: scale(1.01); }
          100% { filter: brightness(1); transform: scale(1); }
        }
        @keyframes digitRollGlow {
          0% { opacity: 0.8; transform: translateY(-1px); }
          50% { opacity: 1; transform: translateY(1px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes deltaFloatFade {
          0% { opacity: 0; transform: translateY(6px) scale(0.85); }
          20% { opacity: 1; transform: translateY(0) scale(1); }
          80% { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(-8px) scale(0.9); }
        }
        .price-reveal-active {
          animation: digitRollGlow 0.12s ease-in-out infinite alternate;
        }
        .settled-pulse {
          animation: revealShimmer 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .delta-live-badge {
          animation: deltaFloatFade 2.6s ease-out forwards;
        }
      `}</style>

      {prefix && (
        <span style={{ fontSize: '0.85em', marginRight: '3px', opacity: 0.9 }}>
          {prefix}
        </span>
      )}
      
      <span className={isRevealing ? 'price-reveal-active' : ''}>
        {formatIndianNumber(displayValue)}
      </span>

      {/* Floating Delta Badge on Live Sync (+₹50,000 / -₹10,000) */}
      {showDeltaBadge && deltaInfo && (
        <span
          className="delta-live-badge"
          style={{
            position: 'absolute',
            top: '-18px',
            right: '-10px',
            fontSize: '0.68rem',
            fontWeight: 900,
            padding: '1px 6px',
            borderRadius: '10px',
            background: deltaInfo.type === 'up' ? '#16a34a' : '#dc2626',
            color: '#ffffff',
            boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
            pointerEvents: 'none',
            zIndex: 10,
            letterSpacing: '0'
          }}
        >
          {deltaInfo.type === 'up' ? `+₹${Math.round(deltaInfo.amount).toLocaleString('en-IN')}` : `-₹${Math.round(deltaInfo.amount).toLocaleString('en-IN')}`}
        </span>
      )}
    </span>
  );
};
