import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, User as UserIcon, Eye, EyeOff, Sparkles, ChefHat, UserCheck, Shield } from 'lucide-react';
import { api } from '../../api/client';
import { User, BusinessSettings } from '../../types';

interface LoginModalProps {
  onLoginSuccess: (user: User) => void;
  settings?: BusinessSettings | null;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onLoginSuccess, settings: propSettings }) => {
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings | null>(propSettings || null);
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!propSettings) {
      api.getSettings().then(setBusinessSettings).catch(() => {});
    } else {
      setBusinessSettings(propSettings);
    }
  }, [propSettings]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      const res = await api.login(username, password);
      onLoginSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  const setPresetUser = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setError('');
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'linear-gradient(135deg, #0b0f19 0%, #111827 50%, #0f172a 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 999999,
      padding: '16px',
      overflowY: 'auto'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '460px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)',
        overflow: 'hidden'
      }}>
        {/* Top Header with Brand Gradient */}
        <div style={{
          background: 'linear-gradient(135deg, #d32f2f 0%, #991b1b 100%)',
          padding: '26px 24px 20px 24px',
          textAlign: 'center',
          color: '#ffffff',
          position: 'relative'
        }}>
          {/* 100% Offline Pill */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(4px)',
            padding: '3px 10px',
            borderRadius: '20px',
            fontSize: '0.72rem',
            fontWeight: 800,
            letterSpacing: '0.04em',
            marginBottom: '12px'
          }}>
            ⚡ 100% OFFLINE SECURE ERP
          </div>

          <h1 style={{ fontSize: '1.45rem', fontWeight: 900, margin: 0, letterSpacing: '0.02em', textTransform: 'uppercase' }}>
            {businessSettings?.business_name || 'MATUKI SWEETS'}
          </h1>
          <p style={{ fontSize: '0.82rem', color: '#fecaca', margin: '4px 0 0 0', fontWeight: 500 }}>
            {businessSettings?.subtitle || 'Complete Wholesale Sweets Billing, Inventory, Production & Order Management'}
          </p>
        </div>

        {/* Quick Role Selection Tabs */}
        <div style={{
          background: '#f8fafc',
          padding: '12px 18px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
            Quick Sign In:
          </span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              onClick={() => setPresetUser('admin', 'admin123')}
              style={{
                background: username === 'admin' ? '#d32f2f' : '#ffffff',
                color: username === 'admin' ? '#ffffff' : '#334155',
                border: '1px solid',
                borderColor: username === 'admin' ? '#d32f2f' : '#cbd5e1',
                padding: '4px 8px',
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Shield size={12} /> Admin
            </button>

            <button
              type="button"
              onClick={() => setPresetUser('cashier', 'cashier123')}
              style={{
                background: username === 'cashier' ? '#16a34a' : '#ffffff',
                color: username === 'cashier' ? '#ffffff' : '#334155',
                border: '1px solid',
                borderColor: username === 'cashier' ? '#16a34a' : '#cbd5e1',
                padding: '4px 8px',
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <UserCheck size={12} /> Cashier
            </button>

            <button
              type="button"
              onClick={() => setPresetUser('karigar', 'karigar123')}
              style={{
                background: username === 'karigar' ? '#ea580c' : '#ffffff',
                color: username === 'karigar' ? '#ffffff' : '#334155',
                border: '1px solid',
                borderColor: username === 'karigar' ? '#ea580c' : '#cbd5e1',
                padding: '4px 8px',
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <ChefHat size={12} /> Karigar
            </button>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} style={{ padding: '22px 24px 26px 24px' }}>
          {error && (
            <div style={{
              padding: '10px 14px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              color: '#dc2626',
              fontSize: '0.82rem',
              fontWeight: 600,
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Username Input */}
          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>
              Username
            </label>
            <div style={{ position: 'relative' }}>
              <UserIcon size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '12px' }} />
              <input
                type="text"
                required
                className="form-input"
                style={{ paddingLeft: '38px', height: '42px', fontSize: '0.88rem' }}
                placeholder="admin"
                value={username}
                onChange={e => setUsername(e.target.value)}
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="form-group" style={{ marginBottom: '18px' }}>
            <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '12px' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                className="form-input"
                style={{ paddingLeft: '38px', paddingRight: '38px', height: '42px', fontSize: '0.88rem' }}
                placeholder="admin123"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '12px',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Sign In Button */}
          <button
            type="submit"
            className="btn btn-primary"
            style={{
              width: '100%',
              height: '44px',
              background: 'linear-gradient(135deg, #d32f2f, #b91c1c)',
              borderColor: '#b91c1c',
              fontWeight: 800,
              fontSize: '0.94rem',
              boxShadow: '0 4px 8px rgba(211, 47, 47, 0.35)',
              cursor: 'pointer'
            }}
            disabled={loading}
          >
            {loading ? 'Verifying...' : '🔐 Sign In to ERP'}
          </button>

          <div style={{
            textAlign: 'center',
            marginTop: '18px',
            paddingTop: '14px',
            borderTop: '1px solid #f1f5f9',
            fontSize: '0.74rem',
            color: '#64748b'
          }}>
            Default Credentials: <code>admin / admin123</code> &bull; <code>cashier / cashier123</code>
          </div>
        </form>
      </div>
    </div>
  );
};
