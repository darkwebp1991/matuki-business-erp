import React, { useState, useEffect, useRef } from 'react';
import { 
  CheckCircle2, 
  Circle, 
  Plus, 
  Sun, 
  Star, 
  Calendar, 
  Clock, 
  Trash2, 
  Sparkles, 
  ChevronRight, 
  ListTodo, 
  Check, 
  Tag, 
  AlertCircle,
  X,
  Maximize2
} from 'lucide-react';
import { api } from '../../api/client';
import { TodoItem, User } from '../../types';
import { formatDate } from '../../utils/formatters';
import { playNotificationChime } from '../../hooks/useProductivityReminder';

interface MicrosoftTodoWidgetProps {
  currentUser?: User | null;
  onNavigateToFullTodos?: () => void;
  isModalOrDrawer?: boolean;
  onClose?: () => void;
}

type TabType = 'MY_DAY' | 'IMPORTANT' | 'PLANNED' | 'ALL';

const PRESET_CATEGORIES = ['General', 'Wholesale', 'Kitchen', 'Delivery', 'Payment', 'Inventory'];

export const MicrosoftTodoWidget: React.FC<MicrosoftTodoWidgetProps> = ({
  currentUser,
  onNavigateToFullTodos,
  isModalOrDrawer = false,
  onClose
}) => {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('MY_DAY');
  
  // Fast Inline Entry State
  const [quickTitle, setQuickTitle] = useState('');
  const [quickDueDate, setQuickDueDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [quickDueTime, setQuickDueTime] = useState<string>('');
  const [quickPriority, setQuickPriority] = useState<'HIGH' | 'MEDIUM' | 'LOW'>('MEDIUM');
  const [quickCategory, setQuickCategory] = useState<string>('General');
  const [quickStarred, setQuickStarred] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showOptionsPopover, setShowOptionsPopover] = useState(false);
  const [showCompleted, setShowCompleted] = useState(true);

  const activeUsername = currentUser?.full_name || currentUser?.username || 'Admin';

  const fetchTodos = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const params: any = {
        username: activeUsername,
        assigned_to: activeUsername
      };

      if (activeTab === 'MY_DAY') params.timeframe = 'MY_DAY';
      else if (activeTab === 'IMPORTANT') params.timeframe = 'IMPORTANT';
      else if (activeTab === 'PLANNED') params.timeframe = 'TOMORROW';

      const raw = await api.getTodos(params);
      const data = (raw as any)?.data !== undefined ? (raw as any).data : raw;
      setTodos(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading Microsoft To-Do Widget data:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodos();
    const interval = setInterval(() => fetchTodos(true), 30000);
    return () => clearInterval(interval);
  }, [activeTab, currentUser]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const payload: any = {
        title: quickTitle.trim(),
        assigned_to: activeUsername,
        created_by: activeUsername,
        category: quickCategory,
        priority: quickPriority,
        starred: (quickStarred || activeTab === 'IMPORTANT') ? 1 : 0,
        due_date: quickDueDate || new Date().toISOString().split('T')[0]
      };

      if (quickDueTime) {
        payload.due_time = quickDueTime;
      }

      await api.createTodo(payload);
      playNotificationChime('COMPLETED');
      setQuickTitle('');
      setShowOptionsPopover(false);
      fetchTodos(true);
    } catch (err) {
      console.error('Failed to create task:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleTask = async (id: number) => {
    // 1. Play audio chime
    playNotificationChime('COMPLETED');

    // 2. Optimistic UI update
    setTodos(prev => prev.map(t => t.id === id ? { ...t, status: t.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED' } : t));

    // 3. Sync with server
    try {
      await api.toggleTodoStatus(id);
    } catch (err) {
      console.error('Failed to toggle task status:', err);
      fetchTodos(true);
    }
  };

  const handleToggleStar = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setTodos(prev => prev.map(t => t.id === id ? { ...t, starred: (t.starred || t.is_starred) ? 0 : 1, is_starred: (t.starred || t.is_starred) ? 0 : 1 } : t));

    try {
      await api.toggleTodoStar(id);
    } catch (err) {
      console.error('Failed to toggle star:', err);
      fetchTodos(true);
    }
  };

  const handleDeleteTask = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!window.confirm('Delete this task?')) return;

    setTodos(prev => prev.filter(t => t.id !== id));
    try {
      await api.deleteTodo(id);
    } catch (err) {
      console.error('Failed to delete task:', err);
      fetchTodos(true);
    }
  };

  // Filter tasks
  const pendingTasks = todos.filter(t => t.status !== 'COMPLETED');
  const completedTasks = todos.filter(t => t.status === 'COMPLETED');
  const totalCount = todos.length;
  const completedCount = completedTasks.length;
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  return (
    <div style={{
      background: 'var(--bg-card)',
      borderRadius: isModalOrDrawer ? '16px' : '14px',
      border: '1.5px solid var(--border-color)',
      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      maxHeight: isModalOrDrawer ? '90vh' : '520px',
      width: '100%',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* 1. Microsoft To-Do Header Banner */}
      <div style={{
        background: activeTab === 'MY_DAY' 
          ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' 
          : activeTab === 'IMPORTANT' 
          ? 'linear-gradient(135deg, #d97706 0%, #b45309 100%)' 
          : activeTab === 'PLANNED' 
          ? 'linear-gradient(135deg, #059669 0%, #047857 100%)' 
          : 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
        color: '#ffffff',
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        position: 'relative'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {activeTab === 'MY_DAY' && <Sun size={22} color="#fde047" />}
            {activeTab === 'IMPORTANT' && <Star size={22} color="#fbbf24" fill="#fbbf24" />}
            {activeTab === 'PLANNED' && <Calendar size={22} color="#6ee7b7" />}
            {activeTab === 'ALL' && <ListTodo size={22} color="#a5b4fc" />}
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#ffffff', lineHeight: 1.1 }}>
                {activeTab === 'MY_DAY' ? 'My Day' : activeTab === 'IMPORTANT' ? 'Important Tasks' : activeTab === 'PLANNED' ? 'Planned Tasks' : 'All My Tasks'}
              </h3>
              <div style={{ fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.82)', fontWeight: 600 }}>
                {todayStr}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {onNavigateToFullTodos && (
              <button
                type="button"
                onClick={onNavigateToFullTodos}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  color: '#ffffff',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                title="Open Full To-Do Manager"
              >
                <Maximize2 size={13} /> Full View
              </button>
            )}

            {isModalOrDrawer && onClose && (
              <button
                type="button"
                onClick={onClose}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  color: '#ffffff',
                  borderRadius: '50%',
                  width: '26px',
                  height: '26px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <X size={15} />
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar Line */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
          <div style={{
            flex: 1,
            height: '6px',
            background: 'rgba(0, 0, 0, 0.25)',
            borderRadius: '10px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${percentage}%`,
              height: '100%',
              background: '#34d399',
              borderRadius: '10px',
              transition: 'width 0.4s ease'
            }} />
          </div>
          <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#ffffff' }}>
            {completedCount}/{totalCount} ({percentage}%)
          </span>
        </div>

        {/* Smart Tabs Filter Bar */}
        <div style={{
          display: 'flex',
          gap: '4px',
          background: 'rgba(0, 0, 0, 0.2)',
          padding: '3px',
          borderRadius: '8px',
          marginTop: '4px'
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('MY_DAY')}
            style={{
              flex: 1,
              padding: '4px 6px',
              fontSize: '0.72rem',
              fontWeight: 800,
              borderRadius: '6px',
              border: 'none',
              background: activeTab === 'MY_DAY' ? '#ffffff' : 'transparent',
              color: activeTab === 'MY_DAY' ? '#1e40af' : 'rgba(255, 255, 255, 0.85)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px'
            }}
          >
            <Sun size={12} /> My Day
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('IMPORTANT')}
            style={{
              flex: 1,
              padding: '4px 6px',
              fontSize: '0.72rem',
              fontWeight: 800,
              borderRadius: '6px',
              border: 'none',
              background: activeTab === 'IMPORTANT' ? '#ffffff' : 'transparent',
              color: activeTab === 'IMPORTANT' ? '#b45309' : 'rgba(255, 255, 255, 0.85)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px'
            }}
          >
            <Star size={12} /> Important
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('PLANNED')}
            style={{
              flex: 1,
              padding: '4px 6px',
              fontSize: '0.72rem',
              fontWeight: 800,
              borderRadius: '6px',
              border: 'none',
              background: activeTab === 'PLANNED' ? '#ffffff' : 'transparent',
              color: activeTab === 'PLANNED' ? '#047857' : 'rgba(255, 255, 255, 0.85)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px'
            }}
          >
            <Calendar size={12} /> Planned
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ALL')}
            style={{
              flex: 1,
              padding: '4px 6px',
              fontSize: '0.72rem',
              fontWeight: 800,
              borderRadius: '6px',
              border: 'none',
              background: activeTab === 'ALL' ? '#ffffff' : 'transparent',
              color: activeTab === 'ALL' ? '#3730a3' : 'rgba(255, 255, 255, 0.85)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px'
            }}
          >
            <ListTodo size={12} /> All
          </button>
        </div>
      </div>

      {/* 2. Microsoft To-Do Fast Input Entry Bar */}
      <div style={{
        padding: '10px 14px',
        background: 'var(--bg-card-alt)',
        borderBottom: '1px solid var(--border-color)'
      }}>
        <form onSubmit={handleCreateTask} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--bg-card)',
            border: '1.5px solid var(--border-color)',
            borderRadius: '10px',
            padding: '6px 12px',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)'
          }}>
            <Plus size={18} color="#2563eb" style={{ flexShrink: 0 }} />
            <input
              type="text"
              placeholder="+ Add a task to your daily list..."
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                width: '100%',
                fontSize: '0.86rem',
                fontWeight: 600,
                color: 'var(--text-primary)'
              }}
            />
            {quickTitle.trim() && (
              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  flexShrink: 0
                }}
              >
                Add
              </button>
            )}
          </div>

          {/* Quick Options Bar (Date, Time, Category, Priority) */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <input
                type="date"
                value={quickDueDate}
                onChange={(e) => setQuickDueDate(e.target.value)}
                style={{
                  fontSize: '0.72rem',
                  padding: '2px 6px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  fontWeight: 700
                }}
              />

              <input
                type="time"
                value={quickDueTime}
                onChange={(e) => setQuickDueTime(e.target.value)}
                style={{
                  fontSize: '0.72rem',
                  padding: '2px 6px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  fontWeight: 700
                }}
              />

              <select
                value={quickCategory}
                onChange={(e) => setQuickCategory(e.target.value)}
                style={{
                  fontSize: '0.72rem',
                  padding: '2px 6px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  fontWeight: 700
                }}
              >
                {PRESET_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setQuickStarred(!quickStarred)}
                style={{
                  background: quickStarred ? '#fef3c7' : 'transparent',
                  border: '1px solid ' + (quickStarred ? '#f59e0b' : 'var(--border-color)'),
                  borderRadius: '6px',
                  padding: '2px 6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  color: quickStarred ? '#d97706' : 'var(--text-secondary)'
                }}
              >
                <Star size={12} fill={quickStarred ? '#f59e0b' : 'none'} color="#f59e0b" />
                {quickStarred ? 'Important' : 'Star'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* 3. Task Items List Body */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '10px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px'
      }}>
        {loading && (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
            Loading your tasks...
          </div>
        )}

        {!loading && todos.length === 0 && (
          <div style={{
            padding: '30px 10px',
            textAlign: 'center',
            color: 'var(--text-secondary)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ fontSize: '2.2rem' }}>🎉</span>
            <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              All clear for {activeTab === 'MY_DAY' ? 'My Day' : 'this list'}!
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
              Add a new task above to stay productive today.
            </div>
          </div>
        )}

        {/* Pending Tasks List */}
        {pendingTasks.map(t => (
          <div
            key={t.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              padding: '8px 12px',
              background: 'var(--bg-card)',
              border: '1.5px solid var(--border-color)',
              borderRadius: '10px',
              transition: 'all 0.15s ease'
            }}
          >
            {/* Checkbox & Task Title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
              <button
                type="button"
                onClick={() => handleToggleTask(t.id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
                title="Mark completed"
              >
                <Circle size={18} color="#94a3b8" />
              </button>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0, flex: 1 }}>
                <span style={{
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  wordBreak: 'break-word'
                }}>
                  {t.title}
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                  {(t.category || t.list_category) && (
                    <span style={{ background: '#eff6ff', color: '#2563eb', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>
                      {t.category || t.list_category}
                    </span>
                  )}
                  {t.due_date && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '2px', color: '#475569', fontWeight: 700 }}>
                      <Calendar size={10} /> {formatDate(t.due_date)} {t.due_time ? `@ ${t.due_time}` : ''}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Star & Delete */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
              <button
                type="button"
                onClick={(e) => handleToggleStar(e, t.id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: '3px',
                  cursor: 'pointer'
                }}
                title={(t.starred || t.is_starred) ? "Unmark Important" : "Mark Important"}
              >
                <Star size={16} fill={(t.starred || t.is_starred) ? '#f59e0b' : 'none'} color={(t.starred || t.is_starred) ? '#f59e0b' : '#cbd5e1'} />
              </button>

              <button
                type="button"
                onClick={(e) => handleDeleteTask(e, t.id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: '3px',
                  cursor: 'pointer',
                  color: '#94a3b8'
                }}
                title="Delete task"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}

        {/* Completed Tasks Toggle Section */}
        {completedTasks.length > 0 && (
          <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--border-color)' }}>
            <button
              type="button"
              onClick={() => setShowCompleted(!showCompleted)}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: '0.76rem',
                fontWeight: 800,
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginBottom: '6px'
              }}
            >
              <ChevronRight size={14} style={{ transform: showCompleted ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s ease' }} />
              Completed ({completedTasks.length})
            </button>

            {showCompleted && completedTasks.map(t => (
              <div
                key={t.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  padding: '6px 12px',
                  background: 'rgba(0, 0, 0, 0.02)',
                  borderRadius: '8px',
                  marginBottom: '4px',
                  opacity: 0.75
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                  <button
                    type="button"
                    onClick={() => handleToggleTask(t.id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    <CheckCircle2 size={18} color="#16a34a" />
                  </button>

                  <span style={{
                    fontSize: '0.82rem',
                    textDecoration: 'line-through',
                    color: 'var(--text-secondary)',
                    fontWeight: 600
                  }}>
                    {t.title}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={(e) => handleDeleteTask(e, t.id)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: '3px',
                    cursor: 'pointer',
                    color: '#94a3b8'
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
