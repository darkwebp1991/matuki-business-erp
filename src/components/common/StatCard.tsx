import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: string;
  trendType?: 'positive' | 'negative' | 'neutral';
  color?: 'amber' | 'green' | 'blue' | 'purple' | 'red';
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendType = 'neutral',
  color = 'amber',
  onClick
}) => {
  const colorMap = {
    amber: { border: 'rgba(245, 158, 11, 0.3)', iconBg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24' },
    green: { border: 'rgba(16, 185, 129, 0.3)', iconBg: 'rgba(16, 185, 129, 0.15)', text: '#34d399' },
    blue: { border: 'rgba(56, 189, 248, 0.3)', iconBg: 'rgba(56, 189, 248, 0.15)', text: '#38bdf8' },
    purple: { border: 'rgba(168, 85, 247, 0.3)', iconBg: 'rgba(168, 85, 247, 0.15)', text: '#c084fc' },
    red: { border: 'rgba(244, 63, 94, 0.3)', iconBg: 'rgba(244, 63, 94, 0.15)', text: '#fb7185' }
  };

  const scheme = colorMap[color] || colorMap.amber;

  return (
    <div
      className="glass-card"
      onClick={onClick}
      style={{
        padding: '16px 18px',
        borderLeft: `4px solid ${scheme.text}`,
        cursor: onClick ? 'pointer' : 'default',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: '104px'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{
          fontSize: '0.78rem',
          fontWeight: 700,
          color: 'var(--text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: '0.04em'
        }}>
          {title}
        </span>
        {icon && (
          <div style={{
            padding: '6px',
            borderRadius: 'var(--radius-sm)',
            background: scheme.iconBg,
            color: scheme.text,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {icon}
          </div>
        )}
      </div>

      <div style={{ marginTop: '8px' }}>
        <div style={{
          fontSize: '1.45rem',
          fontWeight: 800,
          color: '#fff',
          fontFamily: 'var(--font-mono)',
          letterSpacing: '-0.02em'
        }}>
          {value}
        </div>

        {(subtitle || trend) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
            {trend && (
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: trendType === 'positive' ? '#34d399' : trendType === 'negative' ? '#fb7185' : 'var(--text-secondary)'
              }}>
                {trend}
              </span>
            )}
            {subtitle && (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {subtitle}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
