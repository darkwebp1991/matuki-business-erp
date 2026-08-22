import { getDatabase } from '../database/connection.js';

let isMigrated = false;

function ensureTodoSchemaMigration(db) {
  if (isMigrated) return;
  try {
    const cols = db.prepare("PRAGMA table_info('todos')").all().map(c => c.name);
    if (!cols.includes('assigned_by_name')) {
      db.prepare("ALTER TABLE todos ADD COLUMN assigned_by_name TEXT DEFAULT 'Admin'").run();
    }
    if (!cols.includes('assignment_status')) {
      db.prepare("ALTER TABLE todos ADD COLUMN assignment_status TEXT DEFAULT 'ACCEPTED'").run();
    }
    if (!cols.includes('rejection_reason')) {
      db.prepare("ALTER TABLE todos ADD COLUMN rejection_reason TEXT DEFAULT ''").run();
    }
    isMigrated = true;
  } catch (e) {
    console.error('Todo schema migration error:', e.message);
  }
}

function extractTimeFromText(text) {
  if (!text) return '';
  const match = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
  if (match) {
    let hours = parseInt(match[1], 10);
    const minutes = match[2] ? match[2].padStart(2, '0') : '00';
    const ampm = match[3].toUpperCase();
    if (hours > 12) hours = hours % 12;
    return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
  }
  return '';
}

export const todoService = {
  // Get todos with user-wise isolation, assignment status, and timeframe filtering
  getTodos(filters = {}) {
    const db = getDatabase();
    ensureTodoSchemaMigration(db);

    let query = 'SELECT * FROM todos WHERE 1=1';
    const params = [];

    const todayStr = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // 1. View Mode Isolation (MY_TASKS, PENDING_REQUESTS, ASSIGNED_BY_ME)
    const activeUsername = filters.currentUser ? (filters.currentUser.full_name || filters.currentUser.username || '').trim() : (filters.username || '').trim();

    if (filters.viewMode === 'PENDING_REQUESTS') {
      // Incoming tasks assigned to current user waiting for Accept/Reject
      if (activeUsername) {
        query += ` AND (LOWER(TRIM(assigned_to_name)) = LOWER(TRIM(?)) OR user_id = ?) AND assignment_status = 'PENDING_ASSIGNMENT'`;
        params.push(activeUsername, filters.userId || -1);
      } else {
        query += ` AND assignment_status = 'PENDING_ASSIGNMENT'`;
      }
    } else if (filters.viewMode === 'ASSIGNED_BY_ME') {
      // Tasks created/assigned by current user to someone else
      if (activeUsername) {
        query += ` AND (LOWER(TRIM(assigned_by_name)) = LOWER(TRIM(?)) OR LOWER(TRIM(created_by)) = LOWER(TRIM(?))) AND LOWER(TRIM(assigned_to_name)) != LOWER(TRIM(?))`;
        params.push(activeUsername, activeUsername, activeUsername);
      } else {
        query += ` AND LOWER(TRIM(assigned_by_name)) != LOWER(TRIM(assigned_to_name))`;
      }
    } else {
      // Default MY_TASKS mode: Only accepted tasks assigned to current user
      if (activeUsername && activeUsername !== 'ALL' && activeUsername !== 'All') {
        query += ` AND (LOWER(TRIM(assigned_to_name)) = LOWER(TRIM(?)) OR user_id = ?) AND (assignment_status IS NULL OR assignment_status = 'ACCEPTED')`;
        params.push(activeUsername, filters.userId || -1);
      } else {
        query += ` AND (assignment_status IS NULL OR assignment_status = 'ACCEPTED')`;
      }
    }

    // Timeframe filtering
    if (filters.timeframe === 'TODAY' || filters.timeframe === 'MY_DAY') {
      query += ` AND (due_date = ? OR (due_date < ? AND status != 'COMPLETED'))`;
      params.push(todayStr, todayStr);
    } else if (filters.timeframe === 'IMPORTANT' || filters.timeframe === 'STARRED') {
      query += ` AND (is_starred = 1 OR priority = 'HIGH')`;
    } else if (filters.timeframe === 'TOMORROW') {
      query += ` AND due_date = ?`;
      params.push(tomorrowStr);
    } else if (filters.timeframe === 'RECURRING') {
      query += ` AND (is_recurring = 1 OR due_date > ?)`;
      params.push(tomorrowStr);
    } else if (filters.timeframe === 'OVERDUE') {
      query += ` AND due_date < ? AND status != 'COMPLETED'`;
      params.push(todayStr);
    } else if (filters.timeframe === 'COMPLETED') {
      query += ` AND status = 'COMPLETED'`;
    }

    // Category / List filter
    if (filters.category && filters.category !== 'All') {
      query += ' AND list_category = ?';
      params.push(filters.category);
    }

    // Status filter
    if (filters.status && filters.timeframe !== 'COMPLETED') {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    // Search query
    if (filters.search) {
      query += ' AND (title LIKE ? OR description LIKE ? OR assigned_by_name LIKE ? OR assigned_to_name LIKE ?)';
      const s = `%${filters.search}%`;
      params.push(s, s, s, s);
    }

    // Smart Ordering:
    // 1. Pending Assignment Requests first (if in view mode)
    // 2. Pending before Completed
    // 3. Overdue items
    // 4. Starred items
    // 5. High Priority
    query += ` ORDER BY 
      CASE WHEN assignment_status = 'PENDING_ASSIGNMENT' THEN 0 ELSE 1 END ASC,
      CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END ASC,
      CASE WHEN (due_date < ? AND status != 'COMPLETED') THEN 0 ELSE 1 END ASC,
      CASE WHEN is_starred = 1 THEN 0 ELSE 1 END ASC,
      CASE priority 
        WHEN 'HIGH' THEN 1 
        WHEN 'MEDIUM' THEN 2 
        WHEN 'LOW' THEN 3 
        ELSE 4 END ASC,
      due_date ASC, 
      due_time ASC, 
      id DESC`;
    params.push(todayStr);

    const rows = db.prepare(query).all(...params);

    return rows.map(r => ({
      ...r,
      is_overdue: (r.due_date < todayStr && r.status !== 'COMPLETED') ? 1 : 0,
      subtasks: r.subtasks_json ? (() => { try { return JSON.parse(r.subtasks_json); } catch(e){ return []; } })() : []
    }));
  },

  // Get single todo by ID
  getTodoById(id) {
    const db = getDatabase();
    ensureTodoSchemaMigration(db);
    const row = db.prepare('SELECT * FROM todos WHERE id = ?').get(id);
    if (!row) return null;
    const todayStr = new Date().toISOString().split('T')[0];
    return {
      ...row,
      is_overdue: (row.due_date < todayStr && row.status !== 'COMPLETED') ? 1 : 0,
      subtasks: row.subtasks_json ? (() => { try { return JSON.parse(row.subtasks_json); } catch(e){ return []; } })() : []
    };
  },

  // Create new task with User Assignment & Status Logic
  createTodo(data, username = 'Admin') {
    const db = getDatabase();
    ensureTodoSchemaMigration(db);

    if (!data.title || !data.title.trim()) {
      throw new Error('Task title is required');
    }

    const title = data.title.trim();
    const description = data.description || '';
    const userId = data.user_id ? Number(data.user_id) : null;
    
    // Creator name & Assignee name
    const assignedByName = (data.assigned_by_name || username || 'Admin').trim();
    const assignedToName = (data.assigned_to_name || username || 'Admin').trim();

    // Assignment status logic:
    // By default, ALL created tasks go directly to 'ACCEPTED' status (My To-Do List)
    // Only set 'PENDING_ASSIGNMENT' if explicitly requested when reassigning to another team member
    let assignmentStatus = data.assignment_status || 'ACCEPTED';

    const dueDate = data.due_date || new Date().toISOString().split('T')[0];
    const dueTime = (data.due_time || '').trim() || extractTimeFromText(title) || extractTimeFromText(description);
    const priority = data.priority || 'MEDIUM';
    const status = data.status || 'PENDING';
    const isRecurring = data.is_recurring ? 1 : 0;
    const recurringFrequency = data.recurring_frequency || 'NONE';
    const isStarred = data.is_starred ? 1 : 0;
    const listCategory = data.list_category || 'General';
    const subtasksJson = data.subtasks ? JSON.stringify(data.subtasks) : (data.subtasks_json || '[]');

    const stmt = db.prepare(`
      INSERT INTO todos (
        title, description, user_id, assigned_to_name, assigned_by_name, assignment_status, rejection_reason, due_date, due_time,
        priority, status, is_recurring, recurring_frequency, is_starred, list_category, subtasks_json, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, '', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      title, description, userId, assignedToName, assignedByName, assignmentStatus, dueDate, dueTime,
      priority, status, isRecurring, recurringFrequency, isStarred, listCategory, subtasksJson, username
    );

    return this.getTodoById(result.lastInsertRowid);
  },

  // Accept Task Assignment
  acceptTodo(id, username = 'Admin') {
    const db = getDatabase();
    ensureTodoSchemaMigration(db);
    const existing = this.getTodoById(id);
    if (!existing) throw new Error('Task not found');

    db.prepare(`
      UPDATE todos
      SET assignment_status = 'ACCEPTED', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(id);

    return this.getTodoById(id);
  },

  // Reject Task Assignment with optional reason
  rejectTodo(id, reason = '', username = 'Admin') {
    const db = getDatabase();
    ensureTodoSchemaMigration(db);
    const existing = this.getTodoById(id);
    if (!existing) throw new Error('Task not found');

    const cleanReason = (reason || 'Rejected by user').trim();

    db.prepare(`
      UPDATE todos
      SET assignment_status = 'REJECTED', rejection_reason = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(cleanReason, id);

    return this.getTodoById(id);
  },

  // Get Pending Request Count for notification badge
  getPendingRequestsCount(username) {
    const db = getDatabase();
    ensureTodoSchemaMigration(db);
    if (!username) return 0;
    const row = db.prepare(`
      SELECT COUNT(*) as count FROM todos
      WHERE LOWER(TRIM(assigned_to_name)) = LOWER(TRIM(?))
        AND assignment_status = 'PENDING_ASSIGNMENT'
    `).get(username);
    return row ? row.count : 0;
  },

  // Update existing task
  updateTodo(id, data) {
    const db = getDatabase();
    ensureTodoSchemaMigration(db);
    const existing = this.getTodoById(id);
    if (!existing) throw new Error('Task not found');

    const title = data.title !== undefined ? data.title.trim() : existing.title;
    const description = data.description !== undefined ? data.description : existing.description;
    const userId = data.user_id !== undefined ? (data.user_id ? Number(data.user_id) : null) : existing.user_id;
    const assignedToName = data.assigned_to_name !== undefined ? data.assigned_to_name : existing.assigned_to_name;
    const assignedByName = data.assigned_by_name !== undefined ? data.assigned_by_name : (existing.assigned_by_name || 'Admin');
    const assignmentStatus = data.assignment_status !== undefined ? data.assignment_status : (existing.assignment_status || 'ACCEPTED');
    const rejectionReason = data.rejection_reason !== undefined ? data.rejection_reason : (existing.rejection_reason || '');
    const dueDate = data.due_date !== undefined ? data.due_date : existing.due_date;
    const dueTime = data.due_time !== undefined ? data.due_time : existing.due_time;
    const priority = data.priority !== undefined ? data.priority : existing.priority;
    const status = data.status !== undefined ? data.status : existing.status;
    const isRecurring = data.is_recurring !== undefined ? (data.is_recurring ? 1 : 0) : existing.is_recurring;
    const recurringFrequency = data.recurring_frequency !== undefined ? data.recurring_frequency : existing.recurring_frequency;
    const isStarred = data.is_starred !== undefined ? (data.is_starred ? 1 : 0) : existing.is_starred;
    const listCategory = data.list_category !== undefined ? data.list_category : (existing.list_category || 'General');
    const subtasksJson = data.subtasks !== undefined ? JSON.stringify(data.subtasks) : (data.subtasks_json !== undefined ? data.subtasks_json : (existing.subtasks_json || '[]'));
    const completedAt = status === 'COMPLETED' ? (existing.completed_at || new Date().toISOString()) : null;

    db.prepare(`
      UPDATE todos
      SET title = ?, description = ?, user_id = ?, assigned_to_name = ?, assigned_by_name = ?,
          assignment_status = ?, rejection_reason = ?, due_date = ?, due_time = ?,
          priority = ?, status = ?, is_recurring = ?, recurring_frequency = ?, is_starred = ?,
          list_category = ?, subtasks_json = ?, completed_at = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      title, description, userId, assignedToName, assignedByName,
      assignmentStatus, rejectionReason, dueDate, dueTime,
      priority, status, isRecurring, recurringFrequency, isStarred,
      listCategory, subtasksJson, completedAt, id
    );

    return this.getTodoById(id);
  },

  // 1-Click Toggle completion status
  toggleTodoStatus(id) {
    const db = getDatabase();
    ensureTodoSchemaMigration(db);
    const existing = this.getTodoById(id);
    if (!existing) throw new Error('Task not found');

    const newStatus = existing.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    const completedAt = newStatus === 'COMPLETED' ? new Date().toISOString() : null;

    db.prepare(`
      UPDATE todos
      SET status = ?, completed_at = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(newStatus, completedAt, id);

    return this.getTodoById(id);
  },

  // 1-Click Star / Important Toggle
  toggleStar(id) {
    const db = getDatabase();
    ensureTodoSchemaMigration(db);
    const existing = this.getTodoById(id);
    if (!existing) throw new Error('Task not found');

    const newStarred = existing.is_starred ? 0 : 1;
    db.prepare(`
      UPDATE todos
      SET is_starred = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(newStarred, id);

    return this.getTodoById(id);
  },

  // 1-Click Reschedule overdue task to Today
  rescheduleToToday(id) {
    const db = getDatabase();
    ensureTodoSchemaMigration(db);
    const todayStr = new Date().toISOString().split('T')[0];
    db.prepare(`
      UPDATE todos
      SET due_date = ?, priority = 'HIGH', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(todayStr, id);
    return this.getTodoById(id);
  },

  // 1-Click Reschedule ALL overdue tasks to Today
  rescheduleAllOverdueToToday(userId = null) {
    const db = getDatabase();
    ensureTodoSchemaMigration(db);
    const todayStr = new Date().toISOString().split('T')[0];
    let query = `
      UPDATE todos
      SET due_date = ?, priority = 'HIGH', updated_at = CURRENT_TIMESTAMP
      WHERE due_date < ? AND status != 'COMPLETED'
    `;
    const params = [todayStr, todayStr];
    if (userId) {
      query += ' AND user_id = ?';
      params.push(userId);
    }
    const result = db.prepare(query).run(...params);
    return { success: true, updated_count: result.changes };
  },

  // Delete task
  deleteTodo(id) {
    const db = getDatabase();
    ensureTodoSchemaMigration(db);
    db.prepare('DELETE FROM todos WHERE id = ?').run(id);
    return { success: true, message: 'Task deleted successfully' };
  },

  // Today Summary for Dashboard Widget and Productivity Reminders
  getTodaySummary(username = null) {
    const db = getDatabase();
    ensureTodoSchemaMigration(db);
    const todayStr = new Date().toISOString().split('T')[0];

    let query = `
      SELECT * FROM todos 
      WHERE (due_date = ? OR (due_date < ? AND status != 'COMPLETED'))
        AND (assignment_status IS NULL OR assignment_status = 'ACCEPTED')
    `;
    const params = [todayStr, todayStr];

    if (username) {
      query += ' AND (LOWER(TRIM(assigned_to_name)) = LOWER(TRIM(?)) OR user_id IS NULL)';
      params.push(username);
    }

    query += ` ORDER BY 
      CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END ASC,
      CASE WHEN (due_date < '${todayStr}' AND status != 'COMPLETED') THEN 0 ELSE 1 END ASC,
      CASE WHEN is_starred = 1 THEN 0 ELSE 1 END ASC,
      CASE priority WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 ELSE 3 END ASC, 
      due_time ASC`;

    const allTasks = db.prepare(query).all(...params);
    const total = allTasks.length;
    const completed = allTasks.filter(t => t.status === 'COMPLETED').length;
    const pending = total - completed;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 100;
    
    const overdueTasks = allTasks.filter(t => t.due_date < todayStr && t.status !== 'COMPLETED').map(t => ({
      ...t,
      is_overdue: 1
    }));

    const exactTimeTasks = allTasks
      .filter(t => t.status !== 'COMPLETED')
      .map(t => {
        const timeFromTitle = extractTimeFromText(t.title) || extractTimeFromText(t.description);
        const resolvedTime = (t.due_time || '').trim() || timeFromTitle;
        return {
          ...t,
          due_time: resolvedTime || '',
          is_overdue: (t.due_date < todayStr && t.status !== 'COMPLETED') ? 1 : 0
        };
      })
      .filter(t => Boolean(t.due_time));

    return {
      date: todayStr,
      total,
      completed,
      pending,
      percentage,
      has_high_pending_count: pending >= 5,
      overdue_count: overdueTasks.length,
      overdue_tasks: overdueTasks,
      tasks: allTasks.slice(0, 8).map(t => ({
        ...t,
        is_overdue: (t.due_date < todayStr && t.status !== 'COMPLETED') ? 1 : 0
      })),
      exact_time_tasks: exactTimeTasks
    };
  },

  // WhatsApp Group Share Formatter
  generateWhatsAppBriefingText(timeframe = 'TODAY', assignedTo = 'All') {
    const todos = this.getTodos({ timeframe: timeframe, username: assignedTo === 'All' ? null : assignedTo });
    const db = getDatabase();
    const settingsRow = db.prepare('SELECT business_name FROM settings LIMIT 1').get();
    const businessName = (settingsRow?.business_name || 'MATUKI SWEETS').toUpperCase();

    const todayStr = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
    
    let text = `📋 *${businessName} — DAILY WORK BRIEFING*\n`;
    text += `📅 *Date:* ${todayStr}\n`;
    text += `👤 *Assignee:* ${assignedTo}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

    if (todos.length === 0) {
      text += `🎉 *No pending tasks scheduled for this period! Enjoy the day.*\n\n`;
    } else {
      const completed = todos.filter(t => t.status === 'COMPLETED');
      const pending = todos.filter(t => t.status !== 'COMPLETED');
      const overdue = pending.filter(t => t.is_overdue === 1);
      const todayPending = pending.filter(t => t.is_overdue !== 1);

      text += `📊 *Summary:* ${completed.length}/${todos.length} Done (${todos.length > 0 ? Math.round((completed.length / todos.length) * 100) : 100}%)\n\n`;

      if (overdue.length > 0) {
        text += `🚨 *OVERDUE / YESTERDAY PENDING (DO FIRST!):*\n`;
        overdue.forEach((t, i) => {
          const timeTag = t.due_time ? ` [⏰ ${t.due_time}]` : '';
          text += `🔥 ${i + 1}. *${t.title}*${timeTag} _(Due: ${t.due_date})_\n`;
          if (t.description) text += `   ↳ _${t.description}_\n`;
        });
        text += `\n`;
      }

      if (todayPending.length > 0) {
        text += `⏳ *TODAY'S SCHEDULED WORK:*\n`;
        todayPending.forEach((t, i) => {
          const prio = t.priority === 'HIGH' ? '🔴' : t.priority === 'MEDIUM' ? '🟡' : '🟢';
          const star = t.is_starred ? '⭐ ' : '';
          const timeTag = t.due_time ? ` [⏰ ${t.due_time}]` : '';
          text += `${i + 1}. ${star}${prio} *${t.title}*${timeTag}\n`;
          if (t.description) text += `   ↳ _${t.description}_\n`;
          if (t.assigned_to_name && assignedTo === 'All') text += `   ↳ 👤 Assigned: ${t.assigned_to_name}\n`;
        });
        text += `\n`;
      }

      if (completed.length > 0) {
        text += `✅ *COMPLETED TODAY:*\n`;
        completed.forEach((t, i) => {
          text += `✓ ~${t.title}~\n`;
        });
        text += `\n`;
      }
    }

    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `✨ _"Discipline in daily operations creates great enterprise."_\n`;
    text += `🏢 *Matuki Business ERP*`;

    return text;
  }
};
