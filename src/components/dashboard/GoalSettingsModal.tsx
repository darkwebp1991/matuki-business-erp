import React, { useState, useEffect } from 'react';
import { Target, X, Save, Sparkles, Calculator, CheckCircle2, TrendingUp } from 'lucide-react';
import { api } from '../../api/client';
import { formatCurrency } from '../../utils/formatters';

interface GoalSettingsModalProps {
  isOpen: boolean;
  initialData?: any;
  onClose: () => void;
  onSuccess: () => void;
}

export const GoalSettingsModal: React.FC<GoalSettingsModalProps> = ({
  isOpen,
  initialData,
  onClose,
  onSuccess
}) => {
  const currentYearStr = String(new Date().getFullYear());
  const [year, setYear] = useState<string>(initialData?.year || currentYearStr);
  const [annualTarget, setAnnualTarget] = useState<number>(initialData?.annual_target || 5000000);
  const [notes, setNotes] = useState<string>(initialData?.notes || 'Annual Business Target');
  const [saving, setSaving] = useState(false);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Initialize monthly targets from breakdown or default
  const [monthlyTargets, setMonthlyTargets] = useState<{ [key: string]: number }>(() => {
    const map: { [key: string]: number } = {};
    if (initialData?.monthly_breakdown) {
      initialData.monthly_breakdown.forEach((m: any) => {
        map[String(m.month_num)] = m.target;
      });
    } else {
      const avg = Math.round(5000000 / 12);
      for (let i = 1; i <= 12; i++) {
        map[String(i)] = avg;
      }
    }
    return map;
  });

  const handleMonthChange = (monthNum: number, value: string) => {
    const val = Number(value) || 0;
    setMonthlyTargets(prev => ({
      ...prev,
      [String(monthNum)]: val
    }));
  };

  // Auto-distribute annual target equally across 12 months
  const handleAutoDistribute = () => {
    const equalShare = Math.round(annualTarget / 12);
    const newMap: { [key: string]: number } = {};
    for (let i = 1; i <= 12; i++) {
      newMap[String(i)] = equalShare;
    }
    setMonthlyTargets(newMap);
  };

  // Auto-sum of monthly targets to update annual target
  const handleSumMonthly = () => {
    const total = Object.values(monthlyTargets).reduce((sum, v) => sum + (Number(v) || 0), 0);
    setAnnualTarget(total);
  };

  const calculatedMonthlySum = Object.values(monthlyTargets).reduce((sum, v) => sum + (Number(v) || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.saveGoals({
        year,
        annual_target: annualTarget,
        monthly_targets: monthlyTargets,
        notes
      });
      onSuccess();
    } catch (err: any) {
      console.error('Failed to save sales goals:', err);
      alert('Error saving goals: ' + (err.message || 'Server error'));
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: '680px', maxHeight: '92vh', overflow: 'hidden' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header" style={{ background: '#f8fafc' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: '#fff',
              padding: '6px',
              borderRadius: '8px'
            }}>
              <Target size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--text-main)', margin: 0 }}>
                🎯 Configure Sales Targets & Goals ({year})
              </h3>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                Set annual and month-wise milestone goals to track business growth
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div className="modal-body" style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Top Row: Year Selection & Annual Target */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '130px 1fr auto',
              gap: '12px',
              alignItems: 'flex-end',
              background: '#f8fafc',
              padding: '14px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0'
            }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Target Year</label>
                <select
                  className="form-select"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  style={{ fontWeight: 800 }}
                >
                  <option value="2025">2025</option>
                  <option value="2025-26">2025-26</option>
                  <option value="2026">2026</option>
                  <option value="2026-27">2026-27</option>
                  <option value="2027">2027</option>
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">🎯 Final Annual Goal Amount (₹)</label>
                <input
                  type="number"
                  className="form-input font-mono"
                  style={{ fontWeight: 900, fontSize: '1rem', color: '#2563eb' }}
                  value={annualTarget}
                  onChange={(e) => setAnnualTarget(Number(e.target.value) || 0)}
                  placeholder="e.g. 5000000"
                  required
                />
              </div>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleAutoDistribute}
                style={{ height: '34px', fontSize: '0.74rem', fontWeight: 800, color: '#059669', borderColor: '#a7f3d0' }}
                title="Split Annual Target equally across all 12 months"
              >
                <Calculator size={13} /> Auto-Split (÷12)
              </button>
            </div>

            {/* Month-Wise Targets Grid */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  📅 Monthly Sales Milestones (12 Months)
                </div>
                <div style={{ fontSize: '0.74rem', color: calculatedMonthlySum === annualTarget ? '#059669' : '#d97706', fontWeight: 800 }}>
                  Sum of Months: {formatCurrency(calculatedMonthlySum)} {calculatedMonthlySum !== annualTarget && `(Diff: ₹${Math.abs(annualTarget - calculatedMonthlySum)})`}
                </div>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '10px'
              }}>
                {monthNames.map((name, idx) => {
                  const mNum = idx + 1;
                  const isCurrent = mNum === (new Date().getMonth() + 1);
                  return (
                    <div
                      key={mNum}
                      style={{
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: isCurrent ? '1.5px solid #3b82f6' : '1px solid #e2e8f0',
                        background: isCurrent ? '#eff6ff' : '#ffffff',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '3px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.74rem', fontWeight: isCurrent ? 900 : 700, color: isCurrent ? '#1e40af' : '#475569' }}>
                          {name} {isCurrent && '★'}
                        </span>
                        <span style={{ fontSize: '0.64rem', color: '#94a3b8' }}>M{mNum}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontSize: '0.78rem', color: '#64748b' }}>₹</span>
                        <input
                          type="number"
                          className="form-input font-mono"
                          style={{ padding: '3px 6px', fontSize: '0.82rem', fontWeight: 700 }}
                          value={monthlyTargets[String(mNum)] || 0}
                          onChange={(e) => handleMonthChange(mNum, e.target.value)}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Notes */}
            <div className="form-group">
              <label className="form-label">Goal Notes & Vision</label>
              <input
                type="text"
                className="form-input"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Diwal / Festive season peak growth target"
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleSumMonthly}
              style={{ color: '#2563eb' }}
            >
              Sync Total with Months
            </button>
            <button
              type="submit"
              className="btn btn-vyapar-green btn-sm"
              disabled={saving}
              style={{ fontWeight: 800, padding: '6px 16px' }}
            >
              <Save size={14} /> {saving ? 'Saving...' : 'Save Goals & Targets'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
