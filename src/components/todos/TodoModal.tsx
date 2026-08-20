import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, AlertCircle, Repeat, User as UserIcon } from 'lucide-react';
import { api } from '../../api/client';
import { TodoItem, User } from '../../types';

interface TodoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  initialData?: TodoItem | null;
  currentUser?: User | null;
}

export const TodoModal: React.FC<TodoModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  initialData,
  currentUser
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedToName, setAssignedToName] = useState('Admin');
  const [userId, setUserId] = useState<number | null>(null);
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueTime, setDueTime] = useState('');
  const [priority, setPriority] = useState<'HIGH' | 'MEDIUM' | 'LOW'>('MEDIUM');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState<'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY'>('NONE');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      api.getUsers().then(setUsers).catch(console.error);

      if (initialData) {
        setTitle(initialData.title);
        setDescription(initialData.description || '');
        setAssignedToName(initialData.assigned_to_name || 'Admin');
        setUserId(initialData.user_id || null);
        setDueDate(initialData.due_date);
        setDueTime(initialData.due_time || '');
        setPriority(initialData.priority || 'MEDIUM');
        setIsRecurring(Boolean(initialData.is_recurring));
        setRecurringFrequency(initialData.recurring_frequency || 'NONE');
      } else {
        setTitle('');
        setDescription('');
        setAssignedToName(currentUser?.full_name || currentUser?.username || 'Admin');
        setUserId(currentUser?.id || null);
        setDueDate(new Date().toISOString().split('T')[0]);
        setDueTime('');
        setPriority('MEDIUM');
        setIsRecurring(false);
        setRecurringFrequency('NONE');
      }
      setError(null);
    }
  }, [isOpen, initialData, currentUser]);

  const handleUserChange = (selectedName: string) => {
    setAssignedToName(selectedName);
    const found = users.find(u => u.full_name === selectedName || u.username === selectedName);
    setUserId(found ? found.id : null);
  };

  const handleQuickDate = (type: 'TODAY' | 'TOMORROW' | 'NEXT_WEEK') => {
    const d = new Date();
    if (type === 'TOMORROW') {
      d.setDate(d.getDate() + 1);
    } else if (type === 'NEXT_WEEK') {
      d.setDate(d.getDate() + 7);
    }
    setDueDate(d.toISOString().split('T')[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please enter a task title');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const payload = {
        title: title.trim(),
        description: description.trim(),
        user_id: userId,
        assigned_to_name: assignedToName,
        due_date: dueDate,
        due_time: dueTime.trim(),
        priority,
        is_recurring: isRecurring ? 1 : 0,
        recurring_frequency: isRecurring ? recurringFrequency : 'NONE',
        username: currentUser?.username || 'Admin'
      };

      if (initialData?.id) {
        await api.updateTodo(initialData.id, payload);
      } else {
        await api.createTodo(payload);
      }

      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save task');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div className="modal-content" style={{ maxWidth: '560px', width: '95%' }}>
        {/* Header */}
        <div className="modal-header" style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', color: '#ffffff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.2rem' }}>📝</span>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#ffffff' }}>
              {initialData ? 'Edit Task' : 'Add New To-Do Task'}
            </h3>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '8px 12px', borderRadius: '6px', fontSize: '0.78rem' }}>
              {error}
            </div>
          )}

          {/* Task Title */}
          <div>
            <label className="form-label" style={{ fontSize: '0.76rem', fontWeight: 800 }}>
              Task Title / Description *
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Inspect evening Mawa stock & prepare Dudhpak batch"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              autoFocus
            />
          </div>

          {/* Additional Notes / Sub-details */}
          <div>
            <label className="form-label" style={{ fontSize: '0.76rem', fontWeight: 800 }}>
              Notes & Specific Instructions (Optional)
            </label>
            <textarea
              className="form-input"
              rows={2}
              placeholder="Add contact numbers, batch requirements, or specific instructions..."
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          {/* Assignee & Priority */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label className="form-label" style={{ fontSize: '0.76rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <UserIcon size={12} /> Assign To Member
              </label>
              <select
                className="form-select"
                value={assignedToName}
                onChange={e => handleUserChange(e.target.value)}
              >
                <option value="Admin">Admin (Master Owner)</option>
                {users.map(u => (
                  <option key={u.id} value={u.full_name || u.username}>
                    {u.full_name || u.username} ({u.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label" style={{ fontSize: '0.76rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <AlertCircle size={12} /> Priority Level
              </label>
              <select
                className="form-select"
                value={priority}
                onChange={e => setPriority(e.target.value as any)}
                style={{
                  color: priority === 'HIGH' ? '#dc2626' : priority === 'MEDIUM' ? '#d97706' : '#15803d',
                  fontWeight: 800
                }}
              >
                <option value="HIGH">🔴 High Priority (Urgent)</option>
                <option value="MEDIUM">🟡 Medium Priority (Normal)</option>
                <option value="LOW">🟢 Low Priority</option>
              </select>
            </div>
          </div>

          {/* Due Date & Exact Time */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label className="form-label" style={{ fontSize: '0.76rem', fontWeight: 800, margin: 0 }}>
                  <Calendar size={12} style={{ display: 'inline', marginRight: '4px' }} />
                  Due Date *
                </label>
                <div style={{ display: 'flex', gap: '3px' }}>
                  <button
                    type="button"
                    onClick={() => handleQuickDate('TODAY')}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.65rem', padding: '1px 5px' }}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickDate('TOMORROW')}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.65rem', padding: '1px 5px' }}
                  >
                    Tmrw
                  </button>
                </div>
              </div>
              <input
                type="date"
                className="form-input"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="form-label" style={{ fontSize: '0.76rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={12} /> Exact Reminder Time
              </label>
              <input
                type="text"
                className="form-input font-mono"
                placeholder="e.g. 11:30 AM or 14:00"
                value={dueTime}
                onChange={e => setDueTime(e.target.value)}
              />
              <span style={{ fontSize: '0.65rem', color: '#64748b' }}>
                Chimes at this exact time
              </span>
            </div>
          </div>

          {/* Recurring Schedule */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '10px 12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0, fontSize: '0.8rem', fontWeight: 700 }}>
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={e => {
                    setIsRecurring(e.target.checked);
                    if (e.target.checked && recurringFrequency === 'NONE') {
                      setRecurringFrequency('DAILY');
                    }
                  }}
                  style={{ width: '16px', height: '16px', accentColor: '#2563eb' }}
                />
                <span>🔁 Recurring Task (Auto-repeats)</span>
              </label>

              {isRecurring && (
                <select
                  className="form-select"
                  value={recurringFrequency}
                  onChange={e => setRecurringFrequency(e.target.value as any)}
                  style={{ width: '140px', padding: '3px 8px', fontSize: '0.75rem', fontWeight: 800 }}
                >
                  <option value="DAILY">Every Day</option>
                  <option value="WEEKLY">Every Week</option>
                  <option value="MONTHLY">Every Month</option>
                </select>
              )}
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="modal-footer" style={{ padding: '8px 0 0 0', border: 'none', justifyContent: 'flex-end', gap: '8px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving} style={{ fontWeight: 800 }}>
              {saving ? 'Saving...' : initialData ? '💾 Update Task' : '➕ Save Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
