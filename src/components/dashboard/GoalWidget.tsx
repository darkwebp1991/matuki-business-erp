import React, { useState, useEffect, useRef } from 'react';
import { Target, Settings2, Trophy, Sparkles } from 'lucide-react';
import { api } from '../../api/client';
import { formatCurrency } from '../../utils/formatters';
import { GoalSettingsModal } from './GoalSettingsModal';
import { GoalCelebrationModal } from './GoalCelebrationModal';

export const GoalWidget: React.FC = () => {
  const [goalData, setGoalData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCelebrationOpen, setIsCelebrationOpen] = useState(false);
  const hasAutoCelebrated = useRef<boolean>(false);

  const fetchGoalData = async (isSilent = false) => {
    try {
      if (!isSilent && !goalData) setLoading(true);
      const res = await api.getGoals();
      const data = (res as any).data || res;
      setGoalData(data);

      // Check if monthly sales goal achieved (>= 100%)
      const cm = data?.current_month;
      if (cm && cm.target > 0 && cm.achieved >= cm.target) {
        const sessionKey = `matuki_celebrate_${data.year}_${cm.month_num}_${Math.floor(cm.achieved / 1000)}`;
        if (!sessionStorage.getItem(sessionKey) && !hasAutoCelebrated.current) {
          hasAutoCelebrated.current = true;
          sessionStorage.setItem(sessionKey, 'true');
          // Launch the full-screen celebration burst!
          setTimeout(() => {
            setIsCelebrationOpen(true);
          }, 400);
        }
      }
    } catch (err) {
      console.error('Error fetching sales goals:', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoalData(false);

    // Real-Time auto-refresh on new bills or payments
    const unsubscribe = api.subscribeToEvents((event) => {
      if (event?.type === 'DATA_CHANGED') {
        fetchGoalData(true);
      }
    });

    const interval = setInterval(() => {
      fetchGoalData(true);
    }, 4000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  if (loading || !goalData) {
    return (
      <div style={{
        background: 'rgba(255, 255, 255, 0.08)',
        borderRadius: '8px',
        padding: '6px 12px',
        fontSize: '0.72rem',
        color: '#94a3b8'
      }}>
        Loading goal...
      </div>
    );
  }

  const achievedPct = Math.min(100, Math.max(0, goalData.achieved_percent || 0));
  const currentMonth = goalData.current_month;

  return (
    <>
      <div style={{
        background: 'rgba(0, 0, 0, 0.25)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '10px',
        padding: '8px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        minWidth: '250px',
        maxWidth: '320px',
        flexShrink: 0
      }}>
        {/* Header Row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ color: '#fbbf24', fontSize: '0.8rem' }}>🎯</span>
            <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#ffffff' }}>
              {goalData.year} Goal:
            </span>
            <strong className="privacy-blur" style={{ color: '#fbbf24', fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
              {formatCurrency(goalData.annual_target)}
            </strong>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#ffffff',
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '0.66rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '3px'
            }}
            title="Configure Sales Target"
          >
            <Settings2 size={10} /> Goals
          </button>
        </div>

        {/* Mini Progress Bar */}
        <div>
          <div className="privacy-blur" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', marginBottom: '3px' }}>
            <span style={{ color: '#86efac', fontWeight: 800 }}>
              Done: {formatCurrency(goalData.total_achieved)} ({goalData.achieved_percent}%)
            </span>
            <span style={{ color: '#fca5a5', fontWeight: 700 }}>
              Rem: {formatCurrency(goalData.remaining_amount)}
            </span>
          </div>

          <div style={{
            width: '100%',
            height: '6px',
            background: 'rgba(0, 0, 0, 0.4)',
            borderRadius: '6px',
            overflow: 'hidden',
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}>
            <div style={{
              width: `${achievedPct}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #10b981 0%, #34d399 50%, #60a5fa 100%)',
              borderRadius: '6px',
              transition: 'width 0.6s ease'
            }} />
          </div>
        </div>

        {/* Current Month Tag */}
        {currentMonth && (
          <div className="privacy-blur" style={{
            fontSize: '0.66rem',
            color: '#cbd5e1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            paddingTop: '4px'
          }}>
            <span>📅 {currentMonth.month_name}: {formatCurrency(currentMonth.target)}</span>
            {currentMonth.target > 0 && currentMonth.achieved >= currentMonth.target ? (
              <button
                type="button"
                onClick={() => setIsCelebrationOpen(true)}
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#ffffff',
                  border: '1px solid #86efac',
                  borderRadius: '10px',
                  padding: '1px 7px',
                  fontSize: '0.65rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                  boxShadow: '0 0 10px rgba(16, 185, 129, 0.5)'
                }}
                title="Goal Achieved! Click to Replay Blast Celebration 🎉"
              >
                <Trophy size={10} color="#fef08a" /> {currentMonth.achieved_percent}% 🏆 Won!
              </button>
            ) : (
              <span style={{ color: '#fde047', fontWeight: 800 }}>
                {currentMonth.achieved_percent}% Done
              </span>
            )}
          </div>
        )}
      </div>

      {/* Goal Settings Modal */}
      {isModalOpen && (
        <GoalSettingsModal
          isOpen={isModalOpen}
          initialData={goalData}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            setIsModalOpen(false);
            fetchGoalData();
          }}
        />
      )}

      {/* FULL SCREEN WINNING MOMENT CELEBRATION MODAL */}
      {isCelebrationOpen && (
        <GoalCelebrationModal
          isOpen={isCelebrationOpen}
          onClose={() => setIsCelebrationOpen(false)}
          goalData={goalData}
        />
      )}
    </>
  );
};
