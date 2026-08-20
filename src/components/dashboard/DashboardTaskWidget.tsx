import React, { useState, useEffect } from 'react';
import { CheckCircle2, Circle, Plus, ArrowRight, Clock, Sparkles } from 'lucide-react';
import { api } from '../../api/client';
import { TodoSummary, TodoItem } from '../../types';
import { playNotificationChime } from '../../hooks/useProductivityReminder';

interface DashboardTaskWidgetProps {
  onNavigateToTodos: () => void;
  userId?: number | null;
}

export const DashboardTaskWidget: React.FC<DashboardTaskWidgetProps> = ({
  onNavigateToTodos,
  userId
}) => {
  const [summary, setSummary] = useState<TodoSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSummary = async () => {
    try {
      const data = await api.getTodoSummary(userId);
      setSummary(data);
    } catch (err) {
      console.error('Error loading task summary:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
    const interval = setInterval(fetchSummary, 45000);
    return () => clearInterval(interval);
  }, [userId]);

  const handleQuickToggle = async (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();

    // 1. Play immediate audio ding
    playNotificationChime('COMPLETED');

    // 2. Optimistic update
    if (summary) {
      setSummary({
        ...summary,
        completed: summary.completed + 1,
        pending: Math.max(0, summary.pending - 1),
        percentage: summary.total > 0 ? Math.round(((summary.completed + 1) / summary.total) * 100) : 100,
        tasks: (summary.tasks || []).map(t => t.id === id ? { ...t, status: 'COMPLETED' } : t)
      });
    }

    // 3. Server sync
    try {
      await api.toggleTodoStatus(id);
    } catch (err) {
      console.error('Failed to toggle from widget:', err);
      fetchSummary();
    }
  };

  if (loading || !summary) {
    return null;
  }

  const pendingTasks = (summary.tasks || []).filter(t => t.status !== 'COMPLETED').slice(0, 2);

  return (
    <div
      onClick={onNavigateToTodos}
      style={{
        background: 'rgba(255, 255, 255, 0.08)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '10px',
        padding: '8px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        minWidth: '260px',
        maxWidth: '340px',
        flexShrink: 0,
        cursor: 'pointer',
        transition: 'all 0.2s ease'
      }}
      title="Click to open Daily Task Manager"
    >
      {/* Header Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ fontSize: '0.85rem' }}>📝</span>
          <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#ffffff' }}>
            Today's Tasks:
          </span>
          <span style={{ fontSize: '0.74rem', fontWeight: 900, color: '#38bdf8' }}>
            {summary.completed}/{summary.total} Done ({summary.percentage}%)
          </span>
        </div>

        <span style={{
          fontSize: '0.66rem',
          color: '#cbd5e1',
          display: 'flex',
          alignItems: 'center',
          gap: '2px',
          fontWeight: 700
        }}>
          Open <ArrowRight size={10} />
        </span>
      </div>

      {/* Progress Bar */}
      <div>
        <div style={{
          width: '100%',
          height: '5px',
          background: 'rgba(0, 0, 0, 0.4)',
          borderRadius: '6px',
          overflow: 'hidden',
          border: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <div style={{
            width: `${summary.percentage}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #38bdf8 0%, #818cf8 100%)',
            borderRadius: '6px',
            transition: 'width 0.5s ease'
          }} />
        </div>
      </div>

      {/* Mini Pending Tasks with instant checkbox */}
      {pendingTasks.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '4px' }}>
          {pendingTasks.map(t => (
            <div
              key={t.id}
              onClick={(e) => handleQuickToggle(e, t.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.68rem',
                color: '#f1f5f9',
                cursor: 'pointer'
              }}
              title="Click checkbox to complete"
            >
              <Circle size={11} color="#94a3b8" style={{ flexShrink: 0 }} />
              <span style={{
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                flex: 1
              }}>
                {t.title}
              </span>
              {t.due_time && (
                <span style={{ fontSize: '0.6rem', color: '#fbbf24', flexShrink: 0, fontWeight: 700 }}>
                  {t.due_time}
                </span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div style={{
          fontSize: '0.66rem',
          color: '#86efac',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          paddingTop: '4px',
          fontWeight: 700
        }}>
          <span>✨ All today's tasks completed!</span>
        </div>
      )}
    </div>
  );
};
