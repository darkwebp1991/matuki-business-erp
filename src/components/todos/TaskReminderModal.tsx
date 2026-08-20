import React from 'react';
import { 
  BellRing, 
  Clock, 
  CheckCircle2, 
  X, 
  User, 
  Folder, 
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Calendar
} from 'lucide-react';
import { TodoItem } from '../../types';

interface TaskReminderModalProps {
  task: TodoItem | null;
  onClose: () => void;
  onComplete: (taskId: number) => void;
  onSnooze: (taskId: number, minutes: number) => void;
}

export const TaskReminderModal: React.FC<TaskReminderModalProps> = ({
  task,
  onClose,
  onComplete,
  onSnooze
}) => {
  if (!task) return null;

  const isHighPriority = task.priority === 'HIGH';
  const isStarred = !!task.is_starred;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.78)',
      backdropFilter: 'blur(8px)',
      zIndex: 9999999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '540px',
        boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(225, 29, 72, 0.25)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        animation: 'scaleUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        {/* Animated Top Header Bar with Corporate Alert Gradient */}
        <div style={{
          background: isHighPriority 
            ? 'linear-gradient(135deg, #881337 0%, #be123c 50%, #e11d48 100%)' 
            : 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)',
          color: '#ffffff',
          padding: '18px 22px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '2px solid rgba(255, 255, 255, 0.12)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '14px',
              background: 'rgba(255, 255, 255, 0.22)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
              border: '1.5px solid rgba(255, 255, 255, 0.35)'
            }}>
              <BellRing size={26} color="#ffffff" className="animate-bounce" />
            </div>
            <div>
              <div style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: '#fef08a',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}>
                <Sparkles size={14} /> કાર્ય સમય રીમાઇન્ડર • TASK DUE NOW
              </div>
              <h3 style={{ margin: '2px 0 0 0', fontSize: '1.2rem', fontWeight: 900, color: '#ffffff' }}>
                યાદ અપાવવાનો સમય થઈ ગયો છે!
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.18)',
              border: 'none',
              color: '#ffffff',
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            title="Dismiss Alert"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Main Task Title Callout Box */}
          <div style={{
            background: '#f8fafc',
            border: '2px solid #e2e8f0',
            borderRadius: '18px',
            padding: '18px',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: '1.3rem',
                  fontWeight: 900,
                  color: '#0f172a',
                  lineHeight: 1.35,
                  wordBreak: 'break-word'
                }}>
                  {isStarred && <span style={{ marginRight: '6px' }}>⭐</span>}
                  {task.title}
                </div>

                {task.description && (
                  <div style={{
                    fontSize: '0.86rem',
                    color: '#475569',
                    marginTop: '10px',
                    lineHeight: 1.45,
                    background: '#ffffff',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1'
                  }}>
                    {task.description}
                  </div>
                )}
              </div>
            </div>

            {/* Badges Bar */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
              marginTop: '14px',
              paddingTop: '14px',
              borderTop: '1px dashed #cbd5e1'
            }}>
              {/* Due Time Badge */}
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: '#fee2e2',
                color: '#b91c1c',
                padding: '5px 12px',
                borderRadius: '10px',
                fontWeight: 900,
                fontSize: '0.86rem',
                border: '1.5px solid #fca5a5'
              }}>
                <Clock size={16} color="#dc2626" />
                <span>સમય: {task.due_time || 'Today'}</span>
              </div>

              {/* Category Badge */}
              {task.list_category && (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: '#eff6ff',
                  color: '#1d4ed8',
                  padding: '5px 12px',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  border: '1px solid #bfdbfe'
                }}>
                  <Folder size={14} />
                  <span>{task.list_category}</span>
                </div>
              )}

              {/* Assignee Badge */}
              {task.assigned_to_name && (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: '#f0fdf4',
                  color: '#15803d',
                  padding: '5px 12px',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  border: '1px solid #bbf7d0'
                }}>
                  <User size={14} />
                  <span>{task.assigned_to_name}</span>
                </div>
              )}

              {/* Priority Badge */}
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                background: isHighPriority ? '#fef2f2' : '#f8fafc',
                color: isHighPriority ? '#dc2626' : '#64748b',
                padding: '5px 10px',
                borderRadius: '10px',
                fontWeight: 800,
                fontSize: '0.78rem',
                border: `1px solid ${isHighPriority ? '#fecaca' : '#e2e8f0'}`
              }}>
                <span>{isHighPriority ? '🔴 HIGH PRIORITY' : '⚡ ' + (task.priority || 'NORMAL')}</span>
              </div>
            </div>
          </div>

          {/* Safety Notice: Current Screen Work is Preserved */}
          <div style={{
            fontSize: '0.76rem',
            color: '#475569',
            background: '#f1f5f9',
            padding: '10px 14px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            border: '1px solid #e2e8f0'
          }}>
            <ShieldCheck size={18} color="#16a34a" />
            <span>
              <strong>તમારું ચાલુ કામ સુરક્ષિત છે:</strong> આ પોપઅપ બંધ કર્યા પછી તમારું ચાલુ બિલિંગ અથવા ફોર્મ યથાવત રહેશે.
            </span>
          </div>

          {/* 3 Main Action Buttons */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1.4fr 1fr',
            gap: '12px',
            marginTop: '4px'
          }}>
            {/* 1. Mark as Done Button */}
            <button
              type="button"
              onClick={() => onComplete(task.id)}
              className="btn btn-primary"
              style={{
                background: '#16a34a',
                borderColor: '#16a34a',
                color: '#ffffff',
                fontWeight: 900,
                fontSize: '0.96rem',
                padding: '14px 18px',
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 16px rgba(22, 163, 74, 0.4)',
                cursor: 'pointer'
              }}
            >
              <CheckCircle2 size={20} /> ✅ કામ પૂર્ણ થયું (Mark Done)
            </button>

            {/* 2. Snooze 10 Mins Button */}
            <button
              type="button"
              onClick={() => onSnooze(task.id, 10)}
              className="btn btn-secondary"
              style={{
                fontWeight: 800,
                fontSize: '0.86rem',
                padding: '14px 16px',
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                borderColor: '#cbd5e1',
                color: '#1e293b',
                cursor: 'pointer',
                background: '#f8fafc'
              }}
            >
              <RotateCcw size={16} /> ⏰ ૧૦ મિનિટ પછી (Snooze)
            </button>
          </div>

          {/* 3. Dismiss without marking done */}
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#64748b',
              fontSize: '0.8rem',
              fontWeight: 700,
              textDecoration: 'underline',
              cursor: 'pointer',
              textAlign: 'center',
              marginTop: '-2px',
              padding: '6px'
            }}
          >
            હમણાં બંધ કરો અને ચાલુ કામ ચાલુ રાખો (Dismiss & Continue Current Screen)
          </button>
        </div>
      </div>
    </div>
  );
};
