import React, { useState, useEffect, useRef } from 'react';
import { 
  CheckCircle2, 
  Circle, 
  Plus, 
  Calendar, 
  Clock, 
  Share2, 
  Trash2, 
  Search, 
  Repeat, 
  User as UserIcon, 
  Flame, 
  ChevronDown, 
  ChevronRight, 
  X, 
  Sun, 
  Star, 
  CalendarDays, 
  CheckSquare, 
  ListTodo, 
  Folder, 
  Lightbulb, 
  Building2, 
  Utensils, 
  Truck, 
  Wallet, 
  Package, 
  Check,
  Sparkles,
  Camera
} from 'lucide-react';
import { api } from '../../api/client';
import { TodoItem, User } from '../../types';
import { formatDate } from '../../utils/formatters';
import { playNotificationChime } from '../../hooks/useProductivityReminder';
import { parseTaskIntent } from '../../utils/taskAiParser';
import { TaskScreenshotModal } from './TaskScreenshotModal';

interface TodoViewProps {
  currentUser?: User | null;
  settings?: any;
}

type SmartListKey = 'MY_DAY' | 'IMPORTANT' | 'PLANNED' | 'OVERDUE' | 'RECURRING' | 'COMPLETED' | 'ALL';

const PRESET_CATEGORIES = [
  { id: 'Wholesale', label: 'Wholesale & Caterers', icon: <Building2 size={15} color="#3b82f6" /> },
  { id: 'Kitchen', label: 'Kitchen & Production', icon: <Utensils size={15} color="#f59e0b" /> },
  { id: 'Delivery', label: 'Delivery & Drivers', icon: <Truck size={15} color="#10b981" /> },
  { id: 'Payment', label: 'Cash, Bank & Rojmel', icon: <Wallet size={15} color="#8b5cf6" /> },
  { id: 'Inventory', label: 'Raw Materials & Stock', icon: <Package size={15} color="#ec4899" /> },
  { id: 'General', label: 'General / Personal', icon: <Folder size={15} color="#64748b" /> }
];

export const TodoView: React.FC<TodoViewProps> = ({ currentUser, settings }) => {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'MY_TASKS' | 'PENDING_REQUESTS' | 'ASSIGNED_BY_ME'>('MY_TASKS');
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [activeSmartList, setActiveSmartList] = useState<SmartListKey>('MY_DAY');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>('All');
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  
  // Rejection modal state
  const [rejectModalTask, setRejectModalTask] = useState<TodoItem | null>(null);
  const [rejectReasonInput, setRejectReasonInput] = useState<string>('');

  // Right Drawers State (Suggestions vs Task Details)
  const [showSuggestionsDrawer, setShowSuggestionsDrawer] = useState(false);
  const [selectedTaskForDetail, setSelectedTaskForDetail] = useState<TodoItem | null>(null);
  const [showCompletedSection, setShowCompletedSection] = useState(true);
  const [showScreenshotModal, setShowScreenshotModal] = useState(false);

  // Microsoft To-Do Inline Fast-Entry State
  const [quickTitle, setQuickTitle] = useState('');
  const [quickDueDate, setQuickDueDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [quickDueTime, setQuickDueTime] = useState<string>('');
  const [quickPriority, setQuickPriority] = useState<'HIGH' | 'MEDIUM' | 'LOW'>('MEDIUM');
  const [quickRecurring, setQuickRecurring] = useState<'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY'>('NONE');
  const [quickStarred, setQuickStarred] = useState(false);
  const [quickAssignee, setQuickAssignee] = useState<string>(currentUser?.full_name || currentUser?.username || 'Admin');
  const [quickCategory, setQuickCategory] = useState<string>('General');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Popover menus state inside bottom bar
  const [openPopover, setOpenPopover] = useState<'NONE' | 'DATE' | 'TIME' | 'REPEAT' | 'ASSIGNEE'>('NONE');

  // Subtask creation in detail pane
  const [newSubtaskText, setNewSubtaskText] = useState('');

  const quickInputRef = useRef<HTMLInputElement | null>(null);
  const barContainerRef = useRef<HTMLDivElement | null>(null);

  // Real-time AI NLP Intent Parser
  const aiIntent = parseTaskIntent(quickTitle);

  const activeUsername = currentUser?.full_name || currentUser?.username || 'Admin';

  const fetchPendingCount = async () => {
    try {
      const res = await api.getPendingTodoCount(activeUsername);
      setPendingCount(res.count || 0);
    } catch (e) {
      console.error('Error fetching pending todo count:', e);
    }
  };

  const fetchTodos = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      fetchPendingCount();

      const params: any = {
        view_mode: viewMode,
        username: activeUsername,
        assigned_to: selectedUserFilter === 'All' ? activeUsername : selectedUserFilter,
        search: search.trim() || undefined
      };

      if (activeCategory) {
        params.category = activeCategory;
      } else {
        if (activeSmartList === 'MY_DAY') params.timeframe = 'MY_DAY';
        else if (activeSmartList === 'IMPORTANT') params.timeframe = 'IMPORTANT';
        else if (activeSmartList === 'PLANNED') params.timeframe = 'TOMORROW';
        else if (activeSmartList === 'OVERDUE') params.timeframe = 'OVERDUE';
        else if (activeSmartList === 'RECURRING') params.timeframe = 'RECURRING';
        else if (activeSmartList === 'COMPLETED') params.timeframe = 'COMPLETED';
      }

      const raw = await api.getTodos(params);
      const data = (raw as any)?.data !== undefined ? (raw as any).data : raw;
      setTodos(Array.isArray(data) ? data : []);

      if (selectedTaskForDetail) {
        const updated = Array.isArray(data) ? data.find((t: TodoItem) => t.id === selectedTaskForDetail.id) : null;
        if (updated) setSelectedTaskForDetail(updated);
      }
    } catch (err) {
      console.error('Error fetching todos:', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    api.getUsers().then(setUsers).catch(console.error);
  }, []);

  useEffect(() => {
    fetchTodos();
  }, [viewMode, activeSmartList, activeCategory, selectedUserFilter, search]);

  // Real-Time Live Server-Sent Events (SSE) Auto-Sync
  useEffect(() => {
    const unsubscribe = api.subscribeToEvents((event) => {
      if (event?.type === 'DATA_CHANGED' && (!event.module || event.module === 'todos')) {
        fetchTodos(true);
      }
    });
    return () => {
      if (unsubscribe && typeof unsubscribe === 'function') unsubscribe();
    };
  }, [viewMode, activeSmartList, activeCategory, selectedUserFilter, search]);

  // Click outside to close popovers
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (barContainerRef.current && !barContainerRef.current.contains(e.target as Node)) {
        setOpenPopover('NONE');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 1-Second Fast Task Creation (AI-Powered with Enter Key - 0ms Instant Optimistic UI)
  const handleQuickAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const titleText = quickTitle.trim();
    if (!titleText || isSubmitting) return;

    // 1. Immediately lock against duplicate submits and clear input in 0ms
    setIsSubmitting(true);
    setQuickTitle('');
    setQuickDueTime('');
    setQuickStarred(false);
    setQuickRecurring('NONE');
    setOpenPopover('NONE');

    // 2. Play subtle confirmation click
    playNotificationChime('HOURLY');

    // 3. Merge user manual overrides with AI-detected intent
    const finalCategory = activeCategory || (quickCategory !== 'General' ? quickCategory : aiIntent.category);
    const finalDueTime = quickDueTime.trim() || aiIntent.dueTime;
    const finalDueDate = activeSmartList === 'PLANNED' 
      ? (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0]; })()
      : (quickDueDate || aiIntent.dueDate || new Date().toISOString().split('T')[0]);
    const finalPriority = (activeSmartList === 'IMPORTANT' || quickStarred || aiIntent.priority === 'HIGH') ? 'HIGH' : quickPriority;
    const finalRecurring = (activeSmartList === 'RECURRING' || quickRecurring !== 'NONE' || aiIntent.isRecurring);
    const finalFreq = activeSmartList === 'RECURRING' ? 'DAILY' : (quickRecurring !== 'NONE' ? quickRecurring : aiIntent.recurringFrequency);

    const payload = {
      title: titleText,
      description: '',
      assigned_to_name: quickAssignee,
      due_date: finalDueDate,
      due_time: finalDueTime,
      priority: finalPriority,
      is_starred: (activeSmartList === 'IMPORTANT' || quickStarred || finalPriority === 'HIGH') ? 1 : 0,
      list_category: finalCategory,
      is_recurring: finalRecurring ? 1 : 0,
      recurring_frequency: finalFreq,
      username: currentUser?.username || 'Admin'
    };

    // 4. Instant Optimistic Task Insertion (0ms latency on screen)
    const tempId = Date.now();
    const optimisticTask: TodoItem = {
      id: tempId,
      title: titleText,
      description: '',
      assigned_to_name: quickAssignee,
      due_date: finalDueDate,
      due_time: finalDueTime,
      priority: finalPriority,
      status: 'PENDING',
      is_starred: payload.is_starred,
      list_category: finalCategory,
      is_recurring: payload.is_recurring,
      recurring_frequency: finalFreq,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    setTodos(prev => [optimisticTask, ...prev]);

    try {
      const created = await api.createTodo(payload);
      const realTask = (created as any)?.data !== undefined ? (created as any).data : created;
      if (realTask && realTask.id) {
        setTodos(prev => prev.map(t => t.id === tempId ? { ...realTask, is_overdue: 0 } : t));
        setSelectedTaskForDetail(realTask);
      }
      setShowSuggestionsDrawer(false);
      fetchTodos(true);
    } catch (err: any) {
      console.error('Failed to create task:', err);
      // Rollback optimistic task on failure
      setTodos(prev => prev.filter(t => t.id !== tempId));
      setQuickTitle(titleText);
    } finally {
      setIsSubmitting(false);
      // Keep input focused for rapid multi-task entry
      setTimeout(() => {
        quickInputRef.current?.focus();
      }, 50);
    }
  };

  // Instant Optimistic Toggle Status (Zero lag with audio chime)
  const handleToggle = async (id: number, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const target = todos.find(t => t.id === id);
    if (!target) return;

    const willBeCompleted = target.status !== 'COMPLETED';

    // 1. Play immediate audio ding sound
    if (willBeCompleted) {
      playNotificationChime('COMPLETED');
    }

    // 2. Instant Optimistic State Update
    setTodos(prev => prev.map(t => {
      if (t.id === id) {
        return {
          ...t,
          status: willBeCompleted ? 'COMPLETED' : 'PENDING',
          completed_at: willBeCompleted ? new Date().toISOString() : null
        };
      }
      return t;
    }));

    if (selectedTaskForDetail?.id === id) {
      setSelectedTaskForDetail(prev => prev ? {
        ...prev,
        status: willBeCompleted ? 'COMPLETED' : 'PENDING',
        completed_at: willBeCompleted ? new Date().toISOString() : null
      } : null);
    }

    // 3. Background server sync
    try {
      await api.toggleTodoStatus(id);
    } catch (err) {
      console.error('Failed to sync toggle status:', err);
      fetchTodos();
    }
  };

  // Instant Optimistic Star Toggle
  const handleToggleStar = async (id: number, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    setTodos(prev => prev.map(t => {
      if (t.id === id) {
        const nextStarred = t.is_starred ? 0 : 1;
        return { ...t, is_starred: nextStarred, priority: nextStarred ? 'HIGH' : t.priority };
      }
      return t;
    }));

    if (selectedTaskForDetail?.id === id) {
      setSelectedTaskForDetail(prev => prev ? {
        ...prev,
        is_starred: prev.is_starred ? 0 : 1
      } : null);
    }

    try {
      await api.toggleTodoStar(id);
    } catch (err) {
      console.error('Failed to sync star status:', err);
      fetchTodos();
    }
  };

  // 1-Click Reschedule Overdue Task to Today
  const handleRescheduleOverdue = async (id: number, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const todayStr = new Date().toISOString().split('T')[0];

    setTodos(prev => prev.map(t => {
      if (t.id === id) {
        return { ...t, due_date: todayStr, priority: 'HIGH', is_overdue: 0 };
      }
      return t;
    }));

    playNotificationChime('EXACT_TIME');

    try {
      await api.rescheduleTodoToToday(id);
    } catch (err) {
      console.error('Failed to reschedule overdue task:', err);
      fetchTodos();
    }
  };

  const handleRescheduleAllOverdue = async () => {
    try {
      const res = await api.rescheduleAllOverdueTodos(currentUser?.id);
      playNotificationChime('EXACT_TIME');
      fetchTodos();
    } catch (err) {
      console.error('Failed to reschedule all overdue tasks:', err);
    }
  };

  // User Accept Task Assignment
  const handleAcceptTask = async (id: number, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    try {
      playNotificationChime('COMPLETED');
      await api.acceptTodo(id, activeUsername);
      fetchTodos();
    } catch (err) {
      console.error('Failed to accept task:', err);
    }
  };

  const handleOpenRejectModal = (task: TodoItem, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setRejectModalTask(task);
    setRejectReasonInput('');
  };

  const handleConfirmReject = async () => {
    if (!rejectModalTask) return;
    try {
      await api.rejectTodo(rejectModalTask.id, rejectReasonInput.trim() || 'Task rejected', activeUsername);
      setRejectModalTask(null);
      setRejectReasonInput('');
      fetchTodos();
    } catch (err) {
      console.error('Failed to reject task:', err);
    }
  };

  // Small Option: Assign / Reassign Task to Team Member
  const handleAssignTaskToUser = async (id: number, targetAssignee: string) => {
    try {
      const isSelf = targetAssignee.toLowerCase() === activeUsername.toLowerCase();
      const payload = {
        assigned_to_name: targetAssignee,
        assigned_by_name: activeUsername,
        assignment_status: isSelf ? 'ACCEPTED' : 'PENDING_ASSIGNMENT'
      };
      await api.updateTodo(id, payload);
      playNotificationChime('EXACT_TIME');
      fetchTodos();
    } catch (err) {
      console.error('Failed to assign task:', err);
    }
  };

  const handleDelete = async (id: number, title: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!window.confirm(`Are you sure you want to delete: "${title}"?`)) return;

    setTodos(prev => prev.filter(t => t.id !== id));
    if (selectedTaskForDetail?.id === id) setSelectedTaskForDetail(null);

    try {
      await api.deleteTodo(id);
    } catch (err) {
      console.error('Failed to delete task:', err);
      fetchTodos();
    }
  };

  const handleAddSubtask = async () => {
    if (!selectedTaskForDetail || !newSubtaskText.trim()) return;
    const currentSubtasks = selectedTaskForDetail.subtasks || [];
    const updatedSubtasks = [
      ...currentSubtasks,
      { id: String(Date.now()), text: newSubtaskText.trim(), completed: false }
    ];

    setSelectedTaskForDetail({ ...selectedTaskForDetail, subtasks: updatedSubtasks });
    setNewSubtaskText('');

    try {
      await api.updateTodo(selectedTaskForDetail.id, { subtasks: updatedSubtasks });
      fetchTodos();
    } catch (err) {
      console.error('Failed to add step:', err);
    }
  };

  const handleToggleSubtask = async (subtaskId: string) => {
    if (!selectedTaskForDetail) return;
    const currentSubtasks = selectedTaskForDetail.subtasks || [];
    const updatedSubtasks = currentSubtasks.map(s => 
      s.id === subtaskId ? { ...s, completed: !s.completed } : s
    );

    setSelectedTaskForDetail({ ...selectedTaskForDetail, subtasks: updatedSubtasks });

    try {
      await api.updateTodo(selectedTaskForDetail.id, { subtasks: updatedSubtasks });
      fetchTodos();
    } catch (err) {
      console.error('Failed to toggle step:', err);
    }
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    if (!selectedTaskForDetail) return;
    const currentSubtasks = selectedTaskForDetail.subtasks || [];
    const updatedSubtasks = currentSubtasks.filter(s => s.id !== subtaskId);

    setSelectedTaskForDetail({ ...selectedTaskForDetail, subtasks: updatedSubtasks });

    try {
      await api.updateTodo(selectedTaskForDetail.id, { subtasks: updatedSubtasks });
      fetchTodos();
    } catch (err) {
      console.error('Failed to remove step:', err);
    }
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

  // Task List Partitioning
  const overdueTasks = todos.filter(t => t.is_overdue === 1 && t.status !== 'COMPLETED');
  const activePendingTasks = todos.filter(t => t.is_overdue !== 1 && t.status !== 'COMPLETED');
  const completedTasks = todos.filter(t => t.status === 'COMPLETED');

  const totalCount = todos.length;
  const completedCount = completedTasks.length;

  const currentTitle = activeCategory 
    ? activeCategory 
    : activeSmartList === 'MY_DAY' ? '☀️ My Day'
    : activeSmartList === 'IMPORTANT' ? '⭐ Important'
    : activeSmartList === 'PLANNED' ? '📅 Planned & Upcoming'
    : activeSmartList === 'OVERDUE' ? '🚨 Yesterday & Overdue'
    : activeSmartList === 'RECURRING' ? '🔁 Recurring Tasks'
    : activeSmartList === 'COMPLETED' ? '✅ Completed Archive'
    : '📋 All Tasks';

  const todayFormatted = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div style={{
      display: 'flex',
      height: 'calc(100vh - 84px)',
      background: '#f8fafc',
      borderRadius: '12px',
      overflow: 'hidden',
      border: '1px solid var(--border-color)',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)'
    }}>
      
      {/* ========================================================================= */}
      {/* 1. LEFT SIDEBAR: MICROSOFT TO-DO SMART LISTS & CATEGORIES */}
      {/* ========================================================================= */}
      <div style={{
        width: '230px',
        background: '#ffffff',
        borderRight: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '14px 10px',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto' }}>
          {/* User Account / Brand header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 8px 12px 8px', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize: '0.85rem'
            }}>
              {(currentUser?.full_name || currentUser?.username || 'M')[0].toUpperCase()}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                {currentUser?.full_name || 'Matuki Sweets'}
              </div>
              <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                {currentUser?.role || 'Admin'}
              </div>
            </div>
          </div>

          {/* User Task Mode Selector */}
          <div style={{ padding: '6px 4px 8px 4px', borderBottom: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <div style={{ fontSize: '0.64rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', paddingLeft: '4px', marginBottom: '2px' }}>
              Task Workspaces
            </div>
            
            {/* My Active Tasks */}
            <button
              onClick={() => { setViewMode('MY_TASKS'); setActiveCategory(null); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 8px',
                borderRadius: '6px',
                border: 'none',
                background: viewMode === 'MY_TASKS' ? '#2563eb' : '#f8fafc',
                color: viewMode === 'MY_TASKS' ? '#ffffff' : '#334155',
                fontWeight: viewMode === 'MY_TASKS' ? 800 : 600,
                fontSize: '0.78rem',
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>👤</span>
                <span>My Active Tasks</span>
              </div>
            </button>

            {/* Pending Requests */}
            <button
              onClick={() => { setViewMode('PENDING_REQUESTS'); setActiveCategory(null); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 8px',
                borderRadius: '6px',
                border: 'none',
                background: viewMode === 'PENDING_REQUESTS' ? '#d97706' : pendingCount > 0 ? '#fffbe6' : '#f8fafc',
                color: viewMode === 'PENDING_REQUESTS' ? '#ffffff' : pendingCount > 0 ? '#b45309' : '#334155',
                fontWeight: viewMode === 'PENDING_REQUESTS' || pendingCount > 0 ? 800 : 600,
                fontSize: '0.78rem',
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>📥</span>
                <span>Pending Requests</span>
              </div>
              {pendingCount > 0 && (
                <span style={{ fontSize: '0.64rem', background: '#dc2626', color: '#ffffff', padding: '1px 6px', borderRadius: '10px', fontWeight: 900 }}>
                  {pendingCount}
                </span>
              )}
            </button>

            {/* Assigned by Me */}
            <button
              onClick={() => { setViewMode('ASSIGNED_BY_ME'); setActiveCategory(null); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 8px',
                borderRadius: '6px',
                border: 'none',
                background: viewMode === 'ASSIGNED_BY_ME' ? '#4f46e5' : '#f8fafc',
                color: viewMode === 'ASSIGNED_BY_ME' ? '#ffffff' : '#334155',
                fontWeight: viewMode === 'ASSIGNED_BY_ME' ? 800 : 600,
                fontSize: '0.78rem',
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>📤</span>
                <span>Assigned by Me</span>
              </div>
            </button>
          </div>

          {/* Smart Lists */}
          <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {/* My Day */}
            <button
              onClick={() => { setActiveSmartList('MY_DAY'); setActiveCategory(null); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '7px 10px',
                borderRadius: '8px',
                border: 'none',
                background: (!activeCategory && activeSmartList === 'MY_DAY') ? '#eff6ff' : 'transparent',
                color: (!activeCategory && activeSmartList === 'MY_DAY') ? '#1d4ed8' : '#334155',
                fontWeight: (!activeCategory && activeSmartList === 'MY_DAY') ? 800 : 600,
                fontSize: '0.82rem',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sun size={16} color="#2563eb" />
                <span>My Day</span>
              </div>
              {overdueTasks.length > 0 && (
                <span style={{ fontSize: '0.66rem', background: '#fee2e2', color: '#dc2626', padding: '1px 5px', borderRadius: '4px', fontWeight: 900 }}>
                  🚨 {overdueTasks.length}
                </span>
              )}
            </button>

            {/* Important / Starred */}
            <button
              onClick={() => { setActiveSmartList('IMPORTANT'); setActiveCategory(null); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '7px 10px',
                borderRadius: '8px',
                border: 'none',
                background: (!activeCategory && activeSmartList === 'IMPORTANT') ? '#eff6ff' : 'transparent',
                color: (!activeCategory && activeSmartList === 'IMPORTANT') ? '#1d4ed8' : '#334155',
                fontWeight: (!activeCategory && activeSmartList === 'IMPORTANT') ? 800 : 600,
                fontSize: '0.82rem',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Star size={16} color="#f59e0b" />
                <span>Important</span>
              </div>
            </button>

            {/* Planned */}
            <button
              onClick={() => { setActiveSmartList('PLANNED'); setActiveCategory(null); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '7px 10px',
                borderRadius: '8px',
                border: 'none',
                background: (!activeCategory && activeSmartList === 'PLANNED') ? '#eff6ff' : 'transparent',
                color: (!activeCategory && activeSmartList === 'PLANNED') ? '#1d4ed8' : '#334155',
                fontWeight: (!activeCategory && activeSmartList === 'PLANNED') ? 800 : 600,
                fontSize: '0.82rem',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CalendarDays size={16} color="#059669" />
                <span>Planned</span>
              </div>
            </button>

            {/* Overdue / Yesterday */}
            <button
              onClick={() => { setActiveSmartList('OVERDUE'); setActiveCategory(null); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '7px 10px',
                borderRadius: '8px',
                border: 'none',
                background: (!activeCategory && activeSmartList === 'OVERDUE') ? '#fee2e2' : 'transparent',
                color: (!activeCategory && activeSmartList === 'OVERDUE') ? '#b91c1c' : '#dc2626',
                fontWeight: (!activeCategory && activeSmartList === 'OVERDUE') ? 800 : 600,
                fontSize: '0.82rem',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Flame size={16} color="#dc2626" />
                <span>Yesterday & Overdue</span>
              </div>
              {overdueTasks.length > 0 && (
                <span style={{ fontSize: '0.66rem', background: '#dc2626', color: '#ffffff', padding: '1px 5px', borderRadius: '4px', fontWeight: 900 }}>
                  {overdueTasks.length}
                </span>
              )}
            </button>

            {/* Recurring */}
            <button
              onClick={() => { setActiveSmartList('RECURRING'); setActiveCategory(null); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '7px 10px',
                borderRadius: '8px',
                border: 'none',
                background: (!activeCategory && activeSmartList === 'RECURRING') ? '#eff6ff' : 'transparent',
                color: (!activeCategory && activeSmartList === 'RECURRING') ? '#1d4ed8' : '#334155',
                fontWeight: (!activeCategory && activeSmartList === 'RECURRING') ? 800 : 600,
                fontSize: '0.82rem',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Repeat size={16} color="#7c3aed" />
                <span>Recurring Tasks</span>
              </div>
            </button>

            {/* Completed Archive */}
            <button
              onClick={() => { setActiveSmartList('COMPLETED'); setActiveCategory(null); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '7px 10px',
                borderRadius: '8px',
                border: 'none',
                background: (!activeCategory && activeSmartList === 'COMPLETED') ? '#eff6ff' : 'transparent',
                color: (!activeCategory && activeSmartList === 'COMPLETED') ? '#1d4ed8' : '#334155',
                fontWeight: (!activeCategory && activeSmartList === 'COMPLETED') ? 800 : 600,
                fontSize: '0.82rem',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckSquare size={16} color="#16a34a" />
                <span>Completed</span>
              </div>
            </button>

            {/* All Tasks */}
            <button
              onClick={() => { setActiveSmartList('ALL'); setActiveCategory(null); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '7px 10px',
                borderRadius: '8px',
                border: 'none',
                background: (!activeCategory && activeSmartList === 'ALL') ? '#eff6ff' : 'transparent',
                color: (!activeCategory && activeSmartList === 'ALL') ? '#1d4ed8' : '#334155',
                fontWeight: (!activeCategory && activeSmartList === 'ALL') ? 800 : 600,
                fontSize: '0.82rem',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ListTodo size={16} color="#475569" />
                <span>All Tasks</span>
              </div>
            </button>
          </div>

          {/* Operation Groups / Custom Lists */}
          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '10px', marginTop: '6px' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', paddingLeft: '8px', marginBottom: '4px' }}>
              Operations Lists
            </div>
            {PRESET_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => { setActiveCategory(cat.id); }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 8px',
                  borderRadius: '6px',
                  border: 'none',
                  background: activeCategory === cat.id ? '#eff6ff' : 'transparent',
                  color: activeCategory === cat.id ? '#1d4ed8' : '#475569',
                  fontWeight: activeCategory === cat.id ? 800 : 600,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                {cat.icon}
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {cat.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Sidebar Footer */}
        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <button
            type="button"
            onClick={() => setShowScreenshotModal(true)}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
              color: '#38bdf8',
              border: '1px solid #334155',
              borderRadius: '8px',
              padding: '6px 10px',
              fontWeight: 800,
              fontSize: '0.74rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <Camera size={13} /> 📸 WhatsApp Task SS
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. CENTER PANEL: MAIN TASK BOARD WITH TOP HEADER & BOTTOM DOCKED INPUT */}
      {/* ========================================================================= */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '16px 20px 14px 20px',
        minWidth: 0,
        position: 'relative'
      }}>
        
        {/* Top Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: '#0f172a' }}>
              {currentTitle}
            </h1>
            <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '2px' }}>
              {todayFormatted} • <strong style={{ color: '#16a34a' }}>{completedCount} of {totalCount} completed</strong>
            </div>
          </div>

          {/* Top Actions: Member selector + WhatsApp SS + Suggestions toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setShowScreenshotModal(true)}
              style={{
                background: '#25D366',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '5px 12px',
                fontSize: '0.74rem',
                fontWeight: 900,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                boxShadow: '0 2px 6px rgba(37, 211, 102, 0.25)'
              }}
              title="Generate high-resolution task screenshot to send on WhatsApp"
            >
              <Camera size={13} />
              <span>📸 Share Task SS</span>
            </button>

            <select
              value={selectedUserFilter}
              onChange={e => setSelectedUserFilter(e.target.value)}
              className="form-select"
              style={{ padding: '3px 8px', fontSize: '0.74rem', fontWeight: 700, width: '130px' }}
            >
              <option value="All">👥 All Assignees</option>
              <option value="Admin">Admin</option>
              {users.map(u => (
                <option key={u.id} value={u.full_name || u.username}>
                  {u.full_name || u.username}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => {
                setShowSuggestionsDrawer(!showSuggestionsDrawer);
                if (!showSuggestionsDrawer) setSelectedTaskForDetail(null);
              }}
              style={{
                background: showSuggestionsDrawer ? '#fef3c7' : '#ffffff',
                border: `1px solid ${showSuggestionsDrawer ? '#f59e0b' : '#cbd5e1'}`,
                color: showSuggestionsDrawer ? '#b45309' : '#475569',
                borderRadius: '8px',
                padding: '4px 10px',
                fontSize: '0.74rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
              title="Open Suggestions & Yesterday's pending tasks"
            >
              <Lightbulb size={13} color="#f59e0b" />
              <span>Suggestions</span>
              {overdueTasks.length > 0 && (
                <span style={{ background: '#dc2626', color: '#ffffff', fontSize: '0.62rem', padding: '0px 4px', borderRadius: '4px' }}>
                  {overdueTasks.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Task List (Scrollable) */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px', paddingRight: '4px' }}>
          
          {/* Yesterday's Leftover Banner in My Day */}
          {activeSmartList === 'MY_DAY' && overdueTasks.length > 0 && (
            <div style={{
              background: '#fff1f2',
              border: '1.5px solid #fda4af',
              borderRadius: '8px',
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '6px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Flame size={15} color="#e11d48" />
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#9f1239' }}>
                  {overdueTasks.length} tasks leftover from yesterday — auto-prioritized to complete first!
                </span>
              </div>
              <button
                type="button"
                onClick={handleRescheduleAllOverdue}
                className="btn btn-sm"
                style={{ background: '#e11d48', color: '#ffffff', fontSize: '0.68rem', fontWeight: 800, padding: '2px 8px' }}
              >
                Move All to Today
              </button>
            </div>
          )}

          {loading ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#64748b', fontSize: '0.82rem' }}>
              Loading tasks...
            </div>
          ) : viewMode === 'PENDING_REQUESTS' ? (
            todos.length === 0 ? (
              <div style={{ padding: '50px 20px', textAlign: 'center', color: '#64748b' }}>
                <span style={{ fontSize: '2.2rem' }}>🎉</span>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#334155', margin: '8px 0 4px 0' }}>
                  No pending task assignment requests!
                </h3>
                <p style={{ fontSize: '0.76rem', color: '#94a3b8' }}>
                  When your partner or team assigns a task to you, it will appear here for your review and acceptance.
                </p>
              </div>
            ) : (
              todos.map(task => (
                <div
                  key={task.id}
                  style={{
                    background: '#fffbe6',
                    border: '1.5px solid #ffe58f',
                    borderRadius: '10px',
                    padding: '12px 14px',
                    marginBottom: '8px',
                    boxShadow: '0 2px 8px rgba(217, 119, 6, 0.08)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#b45309', background: '#fef3c7', padding: '2px 8px', borderRadius: '12px' }}>
                      📥 Assigned by <strong>{task.assigned_by_name || 'Partner'}</strong>
                    </span>
                    <span style={{ fontSize: '0.7rem', color: '#78350f', fontWeight: 700 }}>
                      📅 Due: {formatDate(task.due_date)} {task.due_time && `• ⏰ ${task.due_time}`}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#0f172a' }}>{task.title}</div>
                  {task.description && <div style={{ fontSize: '0.82rem', color: '#475569', marginTop: '4px' }}>{task.description}</div>}

                  <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={(e) => handleAcceptTask(task.id, e)}
                      style={{
                        background: '#16a34a',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '6px 14px',
                        fontSize: '0.78rem',
                        fontWeight: 900,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        boxShadow: '0 2px 4px rgba(22, 163, 74, 0.2)'
                      }}
                    >
                      ✓ Accept & Add to My List
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleOpenRejectModal(task, e)}
                      style={{
                        background: '#dc2626',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '6px 14px',
                        fontSize: '0.78rem',
                        fontWeight: 900,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      ✕ Reject Task
                    </button>
                  </div>
                </div>
              ))
            )
          ) : viewMode === 'ASSIGNED_BY_ME' ? (
            todos.length === 0 ? (
              <div style={{ padding: '50px 20px', textAlign: 'center', color: '#64748b' }}>
                <span style={{ fontSize: '2.2rem' }}>📤</span>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#334155', margin: '8px 0 4px 0' }}>
                  No tasks assigned to other members yet
                </h3>
                <p style={{ fontSize: '0.76rem', color: '#94a3b8' }}>
                  Use the "+ Add Task" button or quick entry bar to assign tasks to your partner or staff members.
                </p>
              </div>
            ) : (
              todos.map(task => {
                const isAccepted = task.assignment_status === 'ACCEPTED';
                const isRejected = task.assignment_status === 'REJECTED';
                const isPending = task.assignment_status === 'PENDING_ASSIGNMENT';
                return (
                  <div
                    key={task.id}
                    style={{
                      background: isRejected ? '#fef2f2' : isPending ? '#fffbe6' : '#f0fdf4',
                      border: isRejected ? '1.5px solid #fecaca' : isPending ? '1.5px solid #fef08a' : '1.5px solid #bbf7d0',
                      borderRadius: '10px',
                      padding: '12px 14px',
                      marginBottom: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#334155' }}>
                        👤 Assigned to: <strong>{task.assigned_to_name}</strong>
                      </span>
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 900,
                        padding: '2px 8px',
                        borderRadius: '12px',
                        background: isRejected ? '#dc2626' : isPending ? '#d97706' : '#16a34a',
                        color: '#ffffff'
                      }}>
                        {isRejected ? '🔴 REJECTED' : isPending ? '🟡 PENDING APPROVAL' : '🟢 ACCEPTED & ACTIVE'}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>{task.title}</div>
                    {task.description && <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: '2px' }}>{task.description}</div>}

                    {isRejected && task.rejection_reason && (
                      <div style={{ marginTop: '8px', background: '#fee2e2', color: '#991b1b', padding: '6px 10px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700 }}>
                        ❌ Rejection Reason: "{task.rejection_reason}"
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.72rem', color: '#64748b', marginTop: '6px' }}>
                      <span>📅 Due: {formatDate(task.due_date)} {task.due_time && `• ⏰ ${task.due_time}`}</span>
                      <span>• Task Status: {task.status === 'COMPLETED' ? '✅ Completed' : '⏳ Pending'}</span>
                    </div>
                  </div>
                );
              })
            )
          ) : (
            <>
              {/* Overdue / Yesterday Items (Do First) */}
              {overdueTasks.map(task => {
                const isSelected = selectedTaskForDetail?.id === task.id;
                const catBadge = getCategoryBadge(task.list_category);
                return (
                  <div
                    key={task.id}
                    onClick={() => { setSelectedTaskForDetail(task); setShowSuggestionsDrawer(false); }}
                    style={{
                      background: isSelected ? '#fef2f2' : '#ffffff',
                      border: isSelected ? '1.5px solid #dc2626' : '1px solid #fca5a5',
                      borderLeft: '4px solid #dc2626',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      boxShadow: '0 1px 3px rgba(220, 38, 38, 0.05)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                      {/* Interactive Microsoft To-Do Circle Button */}
                      <button
                        type="button"
                        className="todo-circle-btn"
                        onClick={(e) => handleToggle(task.id, e)}
                        title="Mark Completed"
                      >
                        <div className="todo-circle-hover">
                          <Check size={11} color="#16a34a" className="todo-check-hover" />
                        </div>
                      </button>

                      <div>
                        <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#991b1b' }}>
                          {task.title}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.68rem', marginTop: '2px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.64rem', background: catBadge.bg, color: catBadge.color, padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>
                            {catBadge.icon} {catBadge.label}
                          </span>
                          <span style={{ color: '#dc2626', fontWeight: 700 }}>
                            🔥 OVERDUE: {formatDate(task.due_date)}
                          </span>
                          {task.due_time && <span style={{ color: '#1e40af', fontWeight: 700 }}>• ⏰ {task.due_time}</span>}
                          <span style={{ color: '#64748b' }}>• 👤 {task.assigned_to_name || 'Admin'}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={e => e.stopPropagation()}>
                      {/* Small Assign Dropdown */}
                      <select
                        value={task.assigned_to_name || activeUsername}
                        onChange={async (e) => {
                          const newAssignee = e.target.value;
                          if (!newAssignee) return;
                          await handleAssignTaskToUser(task.id, newAssignee);
                        }}
                        style={{
                          fontSize: '0.66rem',
                          fontWeight: 700,
                          padding: '1px 4px',
                          borderRadius: '4px',
                          border: '1px solid #fca5a5',
                          background: '#fef2f2',
                          color: '#b91c1c',
                          cursor: 'pointer'
                        }}
                        title="Click to assign or reassign task to team member"
                      >
                        <option value={activeUsername}>👤 Assign to Me</option>
                        {users.filter(u => (u.full_name || u.username) !== activeUsername).map(u => (
                          <option key={u.id} value={u.full_name || u.username}>
                            👉 Assign to {u.full_name || u.username}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={(e) => handleRescheduleOverdue(task.id, e)}
                        style={{
                          background: '#fee2e2',
                          border: '1px solid #fca5a5',
                          color: '#b91c1c',
                          borderRadius: '4px',
                          padding: '2px 6px',
                          fontSize: '0.66rem',
                          fontWeight: 800,
                          cursor: 'pointer'
                        }}
                        title="Move to Today with High Priority"
                      >
                        Move to Today
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleToggleStar(task.id, e)}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
                      >
                        <Star size={16} fill={task.is_starred ? '#f59e0b' : 'none'} color={task.is_starred ? '#f59e0b' : '#94a3b8'} />
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Active Today Tasks */}
              {activePendingTasks.map(task => {
                const isSelected = selectedTaskForDetail?.id === task.id;
                const catBadge = getCategoryBadge(task.list_category);
                return (
                  <div
                    key={task.id}
                    onClick={() => { setSelectedTaskForDetail(task); setShowSuggestionsDrawer(false); }}
                    style={{
                      background: isSelected ? '#eff6ff' : '#ffffff',
                      border: isSelected ? '1.5px solid #2563eb' : '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      transition: 'all 0.12s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                      {/* Interactive Microsoft To-Do Circle Button */}
                      <button
                        type="button"
                        className="todo-circle-btn"
                        onClick={(e) => handleToggle(task.id, e)}
                        title="Mark Completed"
                      >
                        <div className="todo-circle-hover">
                          <Check size={11} color="#16a34a" className="todo-check-hover" />
                        </div>
                      </button>

                      <div>
                        <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#0f172a' }}>
                          {task.title}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.68rem', marginTop: '2px', flexWrap: 'wrap' }}>
                          {/* Operational Category Badge */}
                          <span style={{ fontSize: '0.64rem', background: catBadge.bg, color: catBadge.color, padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>
                            {catBadge.icon} {catBadge.label}
                          </span>
                          <span style={{ color: '#64748b' }}>• 📅 {formatDate(task.due_date)}</span>
                          {task.due_time && (
                            <span style={{ color: '#1e40af', fontWeight: 800, background: '#eff6ff', padding: '1px 5px', borderRadius: '3px' }}>
                              ⏰ {task.due_time}
                            </span>
                          )}
                          {task.is_recurring === 1 && (
                            <span style={{ color: '#7c3aed', fontWeight: 700 }}>
                              🔁 {task.recurring_frequency || 'Daily'}
                            </span>
                          )}
                          <span style={{ color: '#64748b' }}>• 👤 {task.assigned_to_name || 'Admin'}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={e => e.stopPropagation()}>
                      {/* Small Assign Dropdown */}
                      <select
                        value={task.assigned_to_name || activeUsername}
                        onChange={async (e) => {
                          const newAssignee = e.target.value;
                          if (!newAssignee) return;
                          await handleAssignTaskToUser(task.id, newAssignee);
                        }}
                        style={{
                          fontSize: '0.66rem',
                          fontWeight: 700,
                          padding: '1px 4px',
                          borderRadius: '4px',
                          border: '1px solid #cbd5e1',
                          background: '#f8fafc',
                          color: '#334155',
                          cursor: 'pointer'
                        }}
                        title="Click to assign or reassign task to team member"
                      >
                        <option value={activeUsername}>👤 Assign to Me</option>
                        {users.filter(u => (u.full_name || u.username) !== activeUsername).map(u => (
                          <option key={u.id} value={u.full_name || u.username}>
                            👉 Assign to {u.full_name || u.username}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={(e) => handleToggleStar(task.id, e)}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
                      >
                        <Star size={16} fill={task.is_starred ? '#f59e0b' : 'none'} color={task.is_starred ? '#f59e0b' : '#cbd5e1'} />
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Completed Section (Accordion) */}
              {completedTasks.length > 0 && (
                <div style={{ marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setShowCompletedSection(!showCompletedSection)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#64748b',
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      cursor: 'pointer',
                      padding: '4px 0',
                      marginBottom: '4px'
                    }}
                  >
                    {showCompletedSection ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <span>Completed ({completedTasks.length})</span>
                  </button>

                  {showCompletedSection && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', opacity: 0.7 }}>
                      {completedTasks.map(task => (
                        <div
                          key={task.id}
                          onClick={() => { setSelectedTaskForDetail(task); setShowSuggestionsDrawer(false); }}
                          style={{
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            padding: '6px 12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: 'pointer'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                            <button
                              type="button"
                              className="todo-circle-btn"
                              onClick={(e) => handleToggle(task.id, e)}
                              title="Mark Incomplete"
                            >
                              <CheckCircle2 size={19} color="#16a34a" />
                            </button>
                            <span style={{ fontSize: '0.84rem', textDecoration: 'line-through', color: '#64748b' }}>
                              {task.title}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => handleToggleStar(task.id, e)}
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
                          >
                            <Star size={14} fill={task.is_starred ? '#f59e0b' : 'none'} color={task.is_starred ? '#f59e0b' : '#cbd5e1'} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* ========================================================================= */}
        {/* MICROSOFT TO-DO DOCKED BOTTOM TASK INPUT BAR + AI INTENT BAR */}
        {/* ========================================================================= */}
        <div ref={barContainerRef} style={{ marginTop: '10px', position: 'relative' }}>
          
          {/* Real-time AI Smart Detection Chip Row */}
          {quickTitle.trim().length > 2 && (
            <div style={{
              background: 'linear-gradient(90deg, #eff6ff 0%, #fdf2f8 100%)',
              border: '1px solid #bfdbfe',
              borderRadius: '6px',
              padding: '3px 8px',
              marginBottom: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.7rem',
              color: '#1e40af',
              fontWeight: 700
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ color: '#2563eb', display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <Sparkles size={11} color="#2563eb" /> AI Detected:
                </span>
                <span style={{ background: '#dbeafe', color: '#1e40af', padding: '1px 5px', borderRadius: '4px' }}>
                  {aiIntent.categoryIcon} {aiIntent.categoryLabel}
                </span>
                {aiIntent.dueTime && (
                  <span style={{ background: '#fef3c7', color: '#b45309', padding: '1px 5px', borderRadius: '4px' }}>
                    ⏰ {aiIntent.dueTime}
                  </span>
                )}
                {aiIntent.dueDate !== new Date().toISOString().split('T')[0] && (
                  <span style={{ background: '#dcfce7', color: '#15803d', padding: '1px 5px', borderRadius: '4px' }}>
                    📅 {aiIntent.dueDate}
                  </span>
                )}
                {aiIntent.priority === 'HIGH' && (
                  <span style={{ background: '#fee2e2', color: '#dc2626', padding: '1px 5px', borderRadius: '4px' }}>
                    🔴 High Priority
                  </span>
                )}
              </div>
              <span style={{ fontSize: '0.64rem', color: '#64748b' }}>
                Press Enter to Save
              </span>
            </div>
          )}

          <form
            onSubmit={handleQuickAddSubmit}
            style={{
              background: '#ffffff',
              border: '1.5px solid #2563eb',
              borderRadius: '8px',
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.1)'
            }}
          >
            <div style={{ color: '#2563eb', display: 'flex', alignItems: 'center' }}>
              <Circle size={18} color="#2563eb" />
            </div>

            <input
              ref={quickInputRef}
              type="text"
              placeholder="Add a task (e.g. 'Hiyan caterer payment at 4pm', 'Sugar purchase tomorrow')..."
              value={quickTitle}
              onChange={e => setQuickTitle(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                  handleQuickAddSubmit(e);
                }
              }}
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                fontSize: '0.9rem',
                fontWeight: 600,
                color: '#0f172a',
                background: 'transparent'
              }}
              autoFocus
            />

            {/* Quick Action Icons inside Bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              
              {/* Due Date Popover Button */}
              <button
                type="button"
                onClick={() => setOpenPopover(openPopover === 'DATE' ? 'NONE' : 'DATE')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: quickDueDate ? '#2563eb' : '#64748b',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex'
                }}
                title="Add due date"
              >
                <Calendar size={17} />
              </button>

              {/* Reminder Bell Button */}
              <button
                type="button"
                onClick={() => setOpenPopover(openPopover === 'TIME' ? 'NONE' : 'TIME')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: (quickDueTime || aiIntent.dueTime) ? '#2563eb' : '#64748b',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex'
                }}
                title="Remind me"
              >
                <Clock size={17} />
              </button>

              {/* Repeat Button */}
              <button
                type="button"
                onClick={() => setOpenPopover(openPopover === 'REPEAT' ? 'NONE' : 'REPEAT')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: quickRecurring !== 'NONE' ? '#7c3aed' : '#64748b',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex'
                }}
                title="Repeat"
              >
                <Repeat size={17} />
              </button>

              {/* Assignee Button */}
              <button
                type="button"
                onClick={() => setOpenPopover(openPopover === 'ASSIGNEE' ? 'NONE' : 'ASSIGNEE')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex'
                }}
                title="Assign to"
              >
                <UserIcon size={17} />
              </button>

              {/* Star Toggle Button */}
              <button
                type="button"
                onClick={() => setQuickStarred(!quickStarred)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex'
                }}
                title="Mark Important"
              >
                <Star size={17} fill={quickStarred ? '#f59e0b' : 'none'} color={quickStarred ? '#f59e0b' : '#94a3b8'} />
              </button>

              {/* Explicit Add Button */}
              <button
                type="submit"
                disabled={!quickTitle.trim() || isSubmitting}
                style={{
                  background: quickTitle.trim() ? '#2563eb' : '#e2e8f0',
                  color: quickTitle.trim() ? '#ffffff' : '#94a3b8',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '5px 12px',
                  fontWeight: 800,
                  fontSize: '0.78rem',
                  cursor: quickTitle.trim() ? 'pointer' : 'default',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.15s ease',
                  marginLeft: '4px'
                }}
                title="Save Task (or press Enter)"
              >
                <Plus size={14} /> <span>Add</span>
              </button>
            </div>
          </form>

          {/* Popover 1: Due Date Dropdown */}
          {openPopover === 'DATE' && (
            <div style={{
              position: 'absolute',
              bottom: '100%',
              right: '90px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
              padding: '6px',
              zIndex: 999,
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
              width: '150px'
            }}>
              <button
                type="button"
                onClick={() => { setQuickDueDate(new Date().toISOString().split('T')[0]); setOpenPopover('NONE'); }}
                style={{ padding: '6px 8px', border: 'none', background: 'transparent', textAlign: 'left', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer', borderRadius: '4px' }}
              >
                📅 Today
              </button>
              <button
                type="button"
                onClick={() => { 
                  const tm = new Date(); tm.setDate(tm.getDate() + 1); 
                  setQuickDueDate(tm.toISOString().split('T')[0]); 
                  setOpenPopover('NONE'); 
                }}
                style={{ padding: '6px 8px', border: 'none', background: 'transparent', textAlign: 'left', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer', borderRadius: '4px' }}
              >
                🌅 Tomorrow
              </button>
              <button
                type="button"
                onClick={() => { 
                  const nw = new Date(); nw.setDate(nw.getDate() + 7); 
                  setQuickDueDate(nw.toISOString().split('T')[0]); 
                  setOpenPopover('NONE'); 
                }}
                style={{ padding: '6px 8px', border: 'none', background: 'transparent', textAlign: 'left', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer', borderRadius: '4px' }}
              >
                🗓️ Next Week
              </button>
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '4px' }}>
                <input
                  type="date"
                  className="form-input"
                  style={{ fontSize: '0.72rem', padding: '2px 4px' }}
                  value={quickDueDate}
                  onChange={e => { setQuickDueDate(e.target.value); setOpenPopover('NONE'); }}
                />
              </div>
            </div>
          )}

          {/* Popover 2: Reminder Time Dropdown */}
          {openPopover === 'TIME' && (
            <div style={{
              position: 'absolute',
              bottom: '100%',
              right: '60px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
              padding: '6px',
              zIndex: 999,
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
              width: '160px'
            }}>
              <button
                type="button"
                onClick={() => { setQuickDueTime('10:00 AM'); setOpenPopover('NONE'); }}
                style={{ padding: '6px 8px', border: 'none', background: 'transparent', textAlign: 'left', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer', borderRadius: '4px' }}
              >
                🌅 Morning (10:00 AM)
              </button>
              <button
                type="button"
                onClick={() => { setQuickDueTime('02:00 PM'); setOpenPopover('NONE'); }}
                style={{ padding: '6px 8px', border: 'none', background: 'transparent', textAlign: 'left', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer', borderRadius: '4px' }}
              >
                ☀️ Afternoon (02:00 PM)
              </button>
              <button
                type="button"
                onClick={() => { setQuickDueTime('06:00 PM'); setOpenPopover('NONE'); }}
                style={{ padding: '6px 8px', border: 'none', background: 'transparent', textAlign: 'left', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer', borderRadius: '4px' }}
              >
                🌆 Evening (06:00 PM)
              </button>
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '4px' }}>
                <input
                  type="text"
                  placeholder="e.g. 11:30 AM"
                  className="form-input"
                  style={{ fontSize: '0.72rem', padding: '2px 6px' }}
                  value={quickDueTime}
                  onChange={e => setQuickDueTime(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Popover 3: Repeat Dropdown */}
          {openPopover === 'REPEAT' && (
            <div style={{
              position: 'absolute',
              bottom: '100%',
              right: '30px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
              padding: '6px',
              zIndex: 999,
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
              width: '140px'
            }}>
              <button
                type="button"
                onClick={() => { setQuickRecurring('DAILY'); setOpenPopover('NONE'); }}
                style={{ padding: '6px 8px', border: 'none', background: 'transparent', textAlign: 'left', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer', borderRadius: '4px' }}
              >
                🔁 Daily
              </button>
              <button
                type="button"
                onClick={() => { setQuickRecurring('WEEKLY'); setOpenPopover('NONE'); }}
                style={{ padding: '6px 8px', border: 'none', background: 'transparent', textAlign: 'left', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer', borderRadius: '4px' }}
              >
                🔁 Weekly
              </button>
              <button
                type="button"
                onClick={() => { setQuickRecurring('MONTHLY'); setOpenPopover('NONE'); }}
                style={{ padding: '6px 8px', border: 'none', background: 'transparent', textAlign: 'left', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer', borderRadius: '4px' }}
              >
                🔁 Monthly
              </button>
              <button
                type="button"
                onClick={() => { setQuickRecurring('NONE'); setOpenPopover('NONE'); }}
                style={{ padding: '6px 8px', border: 'none', background: 'transparent', textAlign: 'left', fontSize: '0.76rem', color: '#dc2626', cursor: 'pointer', borderRadius: '4px' }}
              >
                ❌ Never Repeat
              </button>
            </div>
          )}

          {/* Popover 4: Assignee Dropdown */}
          {openPopover === 'ASSIGNEE' && (
            <div style={{
              position: 'absolute',
              bottom: '100%',
              right: '10px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
              padding: '6px',
              zIndex: 999,
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
              width: '180px',
              maxHeight: '180px',
              overflowY: 'auto'
            }}>
              <button
                type="button"
                onClick={() => { setQuickAssignee('Admin'); setOpenPopover('NONE'); }}
                style={{ padding: '6px 8px', border: 'none', background: quickAssignee === 'Admin' ? '#eff6ff' : 'transparent', textAlign: 'left', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer', borderRadius: '4px' }}
              >
                👤 Admin (Owner)
              </button>
              {users.map(u => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => { setQuickAssignee(u.full_name || u.username); setOpenPopover('NONE'); }}
                  style={{ padding: '6px 8px', border: 'none', background: quickAssignee === (u.full_name || u.username) ? '#eff6ff' : 'transparent', textAlign: 'left', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer', borderRadius: '4px' }}
                >
                  👤 {u.full_name || u.username} ({u.role})
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. RIGHT DRAWER: SUGGESTIONS & YESTERDAY'S LEFTOVER WORK (LIGHTBULB ICON) */}
      {/* ========================================================================= */}
      {showSuggestionsDrawer && (
        <div style={{
          width: '280px',
          background: '#ffffff',
          borderLeft: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '14px',
          flexShrink: 0,
          overflowY: 'auto'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Lightbulb size={16} color="#f59e0b" />
                <span style={{ fontSize: '0.88rem', fontWeight: 900, color: '#0f172a' }}>
                  Suggestions
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowSuggestionsDrawer(false)}
                style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Yesterday / Earlier Section */}
            {overdueTasks.length > 0 ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#dc2626', textTransform: 'uppercase' }}>
                    Earlier / Yesterday ({overdueTasks.length})
                  </span>
                  <button
                    type="button"
                    onClick={handleRescheduleAllOverdue}
                    style={{ background: 'transparent', border: 'none', color: '#dc2626', fontSize: '0.68rem', fontWeight: 800, cursor: 'pointer' }}
                  >
                    Add all
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {overdueTasks.map(t => {
                    const catBadge = getCategoryBadge(t.list_category);
                    return (
                      <div
                        key={t.id}
                        style={{
                          padding: '6px 8px',
                          background: '#fff1f2',
                          border: '1px solid #fca5a5',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '6px'
                        }}
                      >
                        <div style={{ overflow: 'hidden' }}>
                          <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#991b1b', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                            {t.title}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '1px' }}>
                            <span style={{ fontSize: '0.6rem', color: catBadge.color, fontWeight: 700 }}>
                              {catBadge.icon} {catBadge.label}
                            </span>
                            <span style={{ fontSize: '0.6rem', color: '#dc2626' }}>
                              • 📅 {formatDate(t.due_date)}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRescheduleOverdue(t.id)}
                          style={{
                            background: '#dc2626',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '50%',
                            width: '22px',
                            height: '22px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            flexShrink: 0
                          }}
                          title="Add to My Day"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div style={{ background: '#f0fdf4', padding: '12px', borderRadius: '8px', textAlign: 'center', fontSize: '0.74rem', color: '#166534', fontWeight: 700 }}>
                ✨ No leftover tasks from yesterday. All caught up!
              </div>
            )}
          </div>

          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '10px', fontSize: '0.68rem', color: '#64748b' }}>
            💡 Click <strong>+</strong> next to any earlier task to add it straight into Today's My Day with High Priority.
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. RIGHT DRAWER: TASK DETAIL INSPECTION PANEL (WHEN CLICKED) */}
      {/* ========================================================================= */}
      {selectedTaskForDetail && !showSuggestionsDrawer && (
        <div style={{
          width: '320px',
          background: '#ffffff',
          borderLeft: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '14px',
          flexShrink: 0,
          overflowY: 'auto'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                Task Details
              </span>
              <button
                type="button"
                onClick={() => setSelectedTaskForDetail(null)}
                style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Editable Title */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', background: '#f8fafc', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <button
                type="button"
                className="todo-circle-btn"
                onClick={() => handleToggle(selectedTaskForDetail.id)}
                style={{ marginTop: '2px' }}
                title={selectedTaskForDetail.status === 'COMPLETED' ? 'Mark Incomplete' : 'Mark Completed'}
              >
                {selectedTaskForDetail.status === 'COMPLETED' ? (
                  <CheckCircle2 size={19} color="#16a34a" />
                ) : (
                  <div className="todo-circle-hover">
                    <Check size={11} color="#16a34a" className="todo-check-hover" />
                  </div>
                )}
              </button>
              <textarea
                value={selectedTaskForDetail.title}
                onChange={e => setSelectedTaskForDetail({ ...selectedTaskForDetail, title: e.target.value })}
                onBlur={async e => {
                  await api.updateTodo(selectedTaskForDetail.id, { title: e.target.value });
                  fetchTodos();
                }}
                rows={2}
                style={{
                  flex: 1,
                  border: 'none',
                  background: 'transparent',
                  fontSize: '0.88rem',
                  fontWeight: 800,
                  color: '#0f172a',
                  resize: 'none',
                  outline: 'none'
                }}
              />
            </div>

            {/* Subtasks / Step Checklist */}
            <div style={{ background: '#f8fafc', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', marginBottom: '4px' }}>
                SUB-STEPS CHECKLIST
              </div>

              {(selectedTaskForDetail.subtasks || []).map(step => (
                <div key={step.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', padding: '3px 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
                    <button
                      type="button"
                      onClick={() => handleToggleSubtask(step.id)}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                      {step.completed ? <CheckCircle2 size={14} color="#16a34a" /> : <Circle size={14} color="#94a3b8" />}
                    </button>
                    <span style={{ fontSize: '0.76rem', color: step.completed ? '#94a3b8' : '#0f172a', textDecoration: step.completed ? 'line-through' : 'none' }}>
                      {step.text}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteSubtask(step.id)}
                    style={{ background: 'transparent', border: 'none', color: '#dc2626', cursor: 'pointer', padding: 0 }}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}

              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px' }}>
                <Plus size={14} color="#2563eb" />
                <input
                  type="text"
                  placeholder="Add step"
                  value={newSubtaskText}
                  onChange={e => setNewSubtaskText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddSubtask(); } }}
                  style={{ flex: 1, border: 'none', background: 'transparent', fontSize: '0.76rem', outline: 'none' }}
                />
              </div>
            </div>

            {/* Date & Time */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              <div>
                <label style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: '2px' }}>
                  📅 Due Date
                </label>
                <input
                  type="date"
                  className="form-input"
                  style={{ fontSize: '0.72rem', padding: '3px 4px' }}
                  value={selectedTaskForDetail.due_date}
                  onChange={async e => {
                    const d = e.target.value;
                    setSelectedTaskForDetail({ ...selectedTaskForDetail, due_date: d });
                    await api.updateTodo(selectedTaskForDetail.id, { due_date: d });
                    fetchTodos();
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: '2px' }}>
                  ⏰ Reminder Time
                </label>
                <input
                  type="text"
                  placeholder="11:30 AM"
                  className="form-input"
                  style={{ fontSize: '0.72rem', padding: '3px 4px' }}
                  value={selectedTaskForDetail.due_time || ''}
                  onChange={e => setSelectedTaskForDetail({ ...selectedTaskForDetail, due_time: e.target.value })}
                  onBlur={async e => {
                    await api.updateTodo(selectedTaskForDetail.id, { due_time: e.target.value });
                    fetchTodos();
                  }}
                />
              </div>
            </div>

            {/* Operation Category & Priority */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              <div>
                <label style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: '2px' }}>
                  🏷️ Operation
                </label>
                <select
                  className="form-select"
                  style={{ fontSize: '0.72rem', padding: '3px 4px', fontWeight: 700 }}
                  value={selectedTaskForDetail.list_category || 'General'}
                  onChange={async e => {
                    const cat = e.target.value;
                    setSelectedTaskForDetail({ ...selectedTaskForDetail, list_category: cat });
                    await api.updateTodo(selectedTaskForDetail.id, { list_category: cat });
                    fetchTodos();
                  }}
                >
                  <option value="Payment">💰 Cash & Payment</option>
                  <option value="Wholesale">🏢 Wholesale & Caterers</option>
                  <option value="Delivery">🛺 Delivery & Drivers</option>
                  <option value="Kitchen">🥣 Kitchen & Production</option>
                  <option value="Inventory">📦 Raw Stock</option>
                  <option value="General">📝 General</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: '2px' }}>
                  ⚡ Priority
                </label>
                <select
                  className="form-select"
                  style={{ fontSize: '0.72rem', padding: '3px 4px', fontWeight: 800 }}
                  value={selectedTaskForDetail.priority}
                  onChange={async e => {
                    const p = e.target.value as any;
                    setSelectedTaskForDetail({ ...selectedTaskForDetail, priority: p });
                    await api.updateTodo(selectedTaskForDetail.id, { priority: p });
                    fetchTodos();
                  }}
                >
                  <option value="HIGH">🔴 High</option>
                  <option value="MEDIUM">🟡 Medium</option>
                  <option value="LOW">🟢 Low</option>
                </select>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: '2px' }}>
                📝 Add Note & Instructions
              </label>
              <textarea
                rows={3}
                className="form-input"
                placeholder="Enter ingredients, contact numbers, or delivery notes..."
                value={selectedTaskForDetail.description || ''}
                onChange={e => setSelectedTaskForDetail({ ...selectedTaskForDetail, description: e.target.value })}
                onBlur={async e => {
                  await api.updateTodo(selectedTaskForDetail.id, { description: e.target.value });
                  fetchTodos();
                }}
                style={{ fontSize: '0.74rem' }}
              />
            </div>
          </div>

          {/* Drawer Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
            <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
              Created: {selectedTaskForDetail.created_at ? formatDate(selectedTaskForDetail.created_at) : 'Today'}
            </span>
            <button
              type="button"
              onClick={() => handleDelete(selectedTaskForDetail.id, selectedTaskForDetail.title)}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.7rem', color: '#dc2626', padding: '2px 6px' }}
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      )}

      {/* Rejection Reason Modal */}
      {rejectModalTask && (
        <div className="modal-overlay" style={{ zIndex: 1200 }}>
          <div className="modal-content" style={{ maxWidth: '420px', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 900, color: '#dc2626' }}>
                ✕ Reject Assigned Task
              </h3>
              <button
                type="button"
                onClick={() => setRejectModalTask(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
              Task: "{rejectModalTask.title}"
            </div>

            <label style={{ fontSize: '0.74rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '4px' }}>
              Reason for Rejection (Optional):
            </label>
            <textarea
              rows={3}
              className="form-input"
              placeholder="e.g. Busy in kitchen production / Out of office until 5 PM..."
              value={rejectReasonInput}
              onChange={e => setRejectReasonInput(e.target.value)}
              autoFocus
              style={{ fontSize: '0.8rem', width: '100%', marginBottom: '14px' }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setRejectModalTask(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={handleConfirmReject}
                style={{ fontWeight: 900 }}
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. VISUAL TASK PLAN SCREENSHOT (SS) EXPORT MODAL FOR WHATSAPP */}
      {/* ========================================================================= */}
      <TaskScreenshotModal
        isOpen={showScreenshotModal}
        onClose={() => setShowScreenshotModal(false)}
        todos={todos}
        timeframeTitle={currentTitle}
        assignedToName={selectedUserFilter}
        settings={settings}
      />
    </div>
  );
};
