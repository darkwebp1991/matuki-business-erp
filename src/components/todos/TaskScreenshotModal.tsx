import React, { useRef, useState } from 'react';
import { 
  X, 
  Download, 
  Copy, 
  Share2, 
  Check, 
  Sparkles, 
  Flame, 
  CheckCircle2, 
  Circle, 
  Clock, 
  Calendar 
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { TodoItem } from '../../types';
import { formatDate } from '../../utils/formatters';

interface TaskScreenshotModalProps {
  isOpen: boolean;
  onClose: () => void;
  todos: TodoItem[];
  timeframeTitle?: string;
  assignedToName?: string;
  settings?: any;
}

export const TaskScreenshotModal: React.FC<TaskScreenshotModalProps> = ({
  isOpen,
  onClose,
  todos,
  timeframeTitle = "Today's Work Plan",
  assignedToName = "All Team Members",
  settings
}) => {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  if (!isOpen) return null;

  const overdueTasks = todos.filter(t => t.is_overdue === 1 && t.status !== 'COMPLETED');
  const activePendingTasks = todos.filter(t => t.is_overdue !== 1 && t.status !== 'COMPLETED');
  const completedTasks = todos.filter(t => t.status === 'COMPLETED');

  const total = todos.length;
  const completed = completedTasks.length;
  const pending = total - completed;
  const progressPct = total > 0 ? Math.round((completed / total) * 100) : 100;
  const todayStr = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // 1-Click Copy Image to Clipboard (Instant Paste Ctrl+V into WhatsApp)
  const handleCopyImage = async () => {
    if (!cardRef.current) return;
    try {
      setCopied(false);
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#0f172a'
      });

      canvas.toBlob(async (blob) => {
        if (!blob) return;
        try {
          // Write directly as PNG image to system clipboard
          await navigator.clipboard.write([
            new ClipboardItem({
              'image/png': blob
            })
          ]);
          setCopied(true);
          setTimeout(() => setCopied(false), 3000);
        } catch (err) {
          // Fallback: If clipboard image permission restricted, trigger instant download
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `Matuki_Daily_Tasks_${new Date().toISOString().split('T')[0]}.png`;
          a.click();
          alert('Task Plan Image downloaded! You can now drag/drop or send it to WhatsApp.');
        }
      }, 'image/png');
    } catch (err) {
      console.error('Error generating canvas:', err);
    }
  };

  // Download high-resolution PNG image
  const handleDownloadPNG = async () => {
    if (!cardRef.current) return;
    try {
      setDownloading(true);
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#0f172a'
      });

      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `Matuki_Daily_Tasks_${new Date().toISOString().split('T')[0]}.png`;
      a.click();
    } catch (err) {
      console.error('Error downloading image:', err);
    } finally {
      setDownloading(false);
    }
  };

  // Open WhatsApp with text while user pastes image
  const handleShareWhatsApp = () => {
    handleCopyImage();
    const bName = (settings?.business_name || 'MATUKI SWEETS').toUpperCase();
    const waText = `📋 *${bName} — DAILY TASK BRIEFING*\n📅 ${todayStr}\n📊 Progress: ${completed}/${total} Tasks Done (${progressPct}%)\n\n*(Task Screenshot image copied to clipboard — press Ctrl+V in WhatsApp to send!)*`;
    window.open(`https://wa.me/?text=${encodeURIComponent(waText)}`, '_blank');
  };

  const getCategoryBadge = (cat?: string) => {
    const map: Record<string, { label: string; bg: string; color: string; icon: string }> = {
      Payment: { label: 'Cash & Payment', bg: '#f3e8ff', color: '#7e22ce', icon: '💰' },
      Wholesale: { label: 'Wholesale & Caterers', bg: '#dbeafe', color: '#1e40af', icon: '🏢' },
      Delivery: { label: 'Delivery & Drivers', bg: '#dcfce7', color: '#15803d', icon: '🛺' },
      Kitchen: { label: 'Kitchen & Production', bg: '#fef3c7', color: '#b45309', icon: '🥣' },
      Inventory: { label: 'Raw Materials & Stock', bg: '#fce7f3', color: '#be185d', icon: '📦' },
      General: { label: 'General / Personal', bg: '#f1f5f9', color: '#475569', icon: '📝' }
    };
    return map[cat || 'General'] || map.General;
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '16px'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        maxWidth: '680px',
        width: '100%',
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden'
      }}>
        {/* Modal Action Header */}
        <div style={{
          padding: '12px 18px',
          background: '#0f172a',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.2rem' }}>📸</span>
            <span style={{ fontSize: '0.95rem', fontWeight: 900, color: '#ffffff' }}>
              WhatsApp Task Screenshot (SS) Generator
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={handleCopyImage}
              className="btn btn-sm"
              style={{
                background: copied ? '#10b981' : '#2563eb',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '0.74rem',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                borderRadius: '6px'
              }}
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              <span>{copied ? '✅ Image Copied (Ctrl+V)' : '📋 Copy Image to Clipboard'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPNG}
              disabled={downloading}
              className="btn btn-sm"
              style={{
                background: '#475569',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '0.74rem',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                borderRadius: '6px'
              }}
            >
              <Download size={13} />
              <span>{downloading ? 'Saving...' : '💾 Save PNG'}</span>
            </button>

            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="btn btn-sm"
              style={{
                background: '#25D366',
                color: '#ffffff',
                fontWeight: 900,
                fontSize: '0.74rem',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 12px',
                borderRadius: '6px'
              }}
            >
              <Share2 size={13} />
              <span>📲 Send to WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Preview Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', background: '#0b1120' }}>
          
          {/* ========================================================================= */}
          {/* HIGH-DEFINITION BRANDED VISUAL TASK SCREENSHOT CARD (FOR WHATSAPP) */}
          {/* ========================================================================= */}
          <div
            ref={cardRef}
            style={{
              background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
              color: '#ffffff',
              borderRadius: '14px',
              padding: '22px',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
            }}
          >
            {/* Header / Brand Banner */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(255, 255, 255, 0.12)', paddingBottom: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: '1rem',
                    color: '#ffffff'
                  }}>
                    M
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.02em', textTransform: 'uppercase' }}>
                      MATUKI SWEETS
                    </h2>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>
                      DAILY OPERATIONS & TASK BRIEFING (દૈનિક કામકાજ પ્લાનર)
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#38bdf8' }}>
                  📅 {todayStr}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#cbd5e1' }}>
                  👤 Assignee: <strong>{assignedToName}</strong>
                </div>
              </div>
            </div>

            {/* Progress & Summary Bar */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '10px',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px'
            }}>
              <div>
                <div style={{ fontSize: '0.86rem', fontWeight: 900, color: '#ffffff' }}>
                  📊 Execution Status: <span style={{ color: '#4ade80' }}>{completed}/{total} Completed</span> ({progressPct}%)
                </div>
                <div style={{ width: '220px', height: '6px', background: 'rgba(255, 255, 255, 0.15)', borderRadius: '4px', marginTop: '5px', overflow: 'hidden' }}>
                  <div style={{ width: `${progressPct}%`, height: '100%', background: 'linear-gradient(90deg, #10b981 0%, #38bdf8 100%)' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ background: '#1e3a8a', color: '#93c5fd', padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 800 }}>
                  ⏳ {pending} Pending
                </div>
                {overdueTasks.length > 0 && (
                  <div style={{ background: '#7f1d1d', color: '#fca5a5', padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 900 }}>
                    🚨 {overdueTasks.length} Overdue
                  </div>
                )}
                <div style={{ background: '#14532d', color: '#86efac', padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 800 }}>
                  ✅ {completed} Done
                </div>
              </div>
            </div>

            {/* SECTION 1: OVERDUE / YESTERDAY LEFTOVER (DO THIS FIRST) */}
            {overdueTasks.length > 0 && (
              <div style={{
                background: 'rgba(220, 38, 38, 0.12)',
                border: '1.5px solid #dc2626',
                borderRadius: '10px',
                padding: '10px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 900, color: '#f87171', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Flame size={14} color="#ef4444" /> 🔥 YESTERDAY'S LEFTOVER WORK — COMPLETE THIS FIRST! ({overdueTasks.length} Tasks)
                </div>

                {overdueTasks.map((t, idx) => {
                  const catBadge = getCategoryBadge(t.list_category);
                  return (
                    <div
                      key={t.id}
                      style={{
                        background: 'rgba(15, 23, 42, 0.8)',
                        border: '1px solid rgba(239, 68, 68, 0.4)',
                        borderLeft: '4px solid #ef4444',
                        borderRadius: '6px',
                        padding: '6px 10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 900, color: '#f87171' }}>{idx + 1}.</span>
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#ffffff' }}>
                            {t.title}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                            <span style={{ fontSize: '0.64rem', background: catBadge.bg, color: catBadge.color, padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>
                              {catBadge.icon} {catBadge.label}
                            </span>
                            <span style={{ fontSize: '0.64rem', color: '#fca5a5', fontWeight: 700 }}>
                              Due: {formatDate(t.due_date)}
                            </span>
                            {t.due_time && (
                              <span style={{ fontSize: '0.64rem', color: '#38bdf8', fontWeight: 700 }}>
                                ⏰ {t.due_time}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <span style={{ fontSize: '0.64rem', background: '#dc2626', color: '#ffffff', padding: '1px 5px', borderRadius: '4px', fontWeight: 900 }}>
                        DO FIRST
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* SECTION 2: TODAY'S SCHEDULED WORK */}
            {activePendingTasks.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 900, color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  ⏳ TODAY'S SCHEDULED TASKS ({activePendingTasks.length})
                </div>

                {activePendingTasks.map((t, idx) => {
                  const catBadge = getCategoryBadge(t.list_category);
                  const isHigh = t.priority === 'HIGH';
                  return (
                    <div
                      key={t.id}
                      style={{
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderLeft: isHigh ? '4px solid #ef4444' : '4px solid #3b82f6',
                        borderRadius: '6px',
                        padding: '6px 10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 900, color: '#94a3b8' }}>{idx + 1}.</span>
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#ffffff' }}>
                            {t.is_starred ? '⭐ ' : ''}{t.title}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                            <span style={{ fontSize: '0.64rem', background: catBadge.bg, color: catBadge.color, padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>
                              {catBadge.icon} {catBadge.label}
                            </span>
                            {t.due_time && (
                              <span style={{ fontSize: '0.64rem', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>
                                ⏰ {t.due_time}
                              </span>
                            )}
                            {t.is_recurring === 1 && (
                              <span style={{ fontSize: '0.64rem', background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                                🔁 {t.recurring_frequency || 'Daily'}
                              </span>
                            )}
                            <span style={{ fontSize: '0.64rem', color: '#94a3b8' }}>
                              👤 {t.assigned_to_name || 'Admin'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <span style={{
                        fontSize: '0.62rem',
                        fontWeight: 900,
                        padding: '1px 5px',
                        borderRadius: '3px',
                        background: isHigh ? 'rgba(239, 68, 68, 0.2)' : 'rgba(234, 179, 8, 0.2)',
                        color: isHigh ? '#fca5a5' : '#fde047'
                      }}>
                        {isHigh ? '🔴 HIGH' : '🟡 MED'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* SECTION 3: COMPLETED TASKS */}
            {completedTasks.length > 0 && (
              <div style={{ opacity: 0.75, display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '8px' }}>
                <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#86efac' }}>
                  ✅ COMPLETED TODAY ({completedTasks.length})
                </div>
                {completedTasks.map(t => (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.76rem', color: '#94a3b8', textDecoration: 'line-through' }}>
                    <CheckCircle2 size={12} color="#10b981" />
                    <span>{t.title}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Footer */}
            <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.12)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.68rem', color: '#64748b' }}>
              <span>✨ <em>"Discipline in daily operations creates great enterprise."</em></span>
              <span style={{ fontWeight: 800, color: '#94a3b8' }}>Matuki Business ERP • Offline System</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
