import React, { useState } from 'react';
import { X, Copy, Check, ExternalLink, RefreshCw } from 'lucide-react';
import { TodoItem } from '../../types';

interface MsTodoExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  todos: TodoItem[];
}

export const MsTodoExportModal: React.FC<MsTodoExportModalProps> = ({ isOpen, onClose, todos }) => {
  const [copiedFeed, setCopiedFeed] = useState(false);
  const [copiedTasks, setCopiedTasks] = useState(false);

  if (!isOpen) return null;

  const feedUrl = "http://200.234.40.204/api/todos/ical";

  const handleCopyFeed = () => {
    navigator.clipboard.writeText(feedUrl);
    setCopiedFeed(true);
    setTimeout(() => setCopiedFeed(false), 2500);
  };

  const handleCopyFormattedTasks = () => {
    const pending = todos.filter(t => t.status !== 'COMPLETED');
    if (pending.length === 0) {
      navigator.clipboard.writeText("No pending tasks for today!");
    } else {
      let text = "📋 MATUKI DAILY TASKS:\n";
      pending.forEach((t, i) => {
        const prio = t.priority === 'HIGH' ? '[!] ' : '[ ] ';
        text += `${i + 1}. ${prio}${t.title}${t.due_time ? ` (Time: ${t.due_time})` : ''}\n`;
      });
      navigator.clipboard.writeText(text.trim());
    }
    setCopiedTasks(true);
    setTimeout(() => setCopiedTasks(false), 2500);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '16px'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        maxWidth: '540px',
        width: '100%',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden',
        border: '1px solid #e2e8f0'
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
          color: '#ffffff',
          padding: '18px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize: '1.2rem'
            }}>
              ☑️
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Sync to Microsoft To-Do</h3>
              <p style={{ margin: 0, fontSize: '0.78rem', opacity: 0.9 }}>Directly copy or live-sync tasks with Microsoft To-Do & Outlook</p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              color: '#ffffff',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Method 1: Live iCal Auto-Sync Feed */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #cbd5e1',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <RefreshCw size={16} color="#2563eb" />
              <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a' }}>Method 1: Live Auto-Sync Feed (Recommended)</span>
            </div>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#475569' }}>
              Subscribe to your ERP tasks feed in Outlook or Microsoft To-Do Web. Automatically updates your Microsoft To-Do Home Screen Widget on Android!
            </p>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="text"
                readOnly
                value={feedUrl}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: '#334155'
                }}
              />
              <button
                onClick={handleCopyFeed}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  background: copiedFeed ? '#10b981' : '#2563eb',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {copiedFeed ? <Check size={14} /> : <Copy size={14} />}
                {copiedFeed ? 'Copied!' : 'Copy Link'}
              </button>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
              <a
                href="https://to-do.office.com/tasks/"
                target="_blank"
                rel="noreferrer"
                style={{
                  fontSize: '0.78rem',
                  color: '#2563eb',
                  fontWeight: 700,
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                Open Microsoft To-Do Web <ExternalLink size={12} />
              </a>
              <a
                href="https://outlook.live.com/calendar/0/addcalendar"
                target="_blank"
                rel="noreferrer"
                style={{
                  fontSize: '0.78rem',
                  color: '#2563eb',
                  fontWeight: 700,
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                Add to Outlook Calendar <ExternalLink size={12} />
              </a>
            </div>
          </div>

          {/* Method 2: Direct 1-Click Copy All Tasks */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #cbd5e1',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Copy size={16} color="#059669" />
              <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a' }}>Method 2: Direct 1-Click Copy Tasks Text</span>
            </div>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#475569' }}>
              Copy all your pending daily tasks to your phone clipboard and paste them into Microsoft To-Do.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleCopyFormattedTasks}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  border: 'none',
                  background: copiedTasks ? '#10b981' : '#059669',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {copiedTasks ? <Check size={16} /> : <Copy size={16} />}
                {copiedTasks ? 'Tasks Copied to Clipboard!' : '📋 Copy All Pending Tasks'}
              </button>
              <a
                href="https://to-do.office.com/tasks/"
                target="_blank"
                rel="noreferrer"
                style={{
                  padding: '10px 16px',
                  borderRadius: '8px',
                  background: '#334155',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                Open App <ExternalLink size={14} />
              </a>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div style={{
          background: '#f1f5f9',
          padding: '12px 24px',
          display: 'flex',
          justifyContent: 'flex-end',
          borderTop: '1px solid #e2e8f0'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#334155',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
