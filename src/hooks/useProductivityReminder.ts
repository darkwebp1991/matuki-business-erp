import { useEffect, useRef } from 'react';
import { api } from '../api/client';
import { TodoItem } from '../types';

/**
 * High-Quality Multi-Harmonic Acoustic Audio Synthesizer
 * Offline, zero external dependencies, crystal clear executive chords.
 */
export function playNotificationChime(type: 'HOURLY' | 'EXACT_TIME' | 'COMPLETED' = 'EXACT_TIME') {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    if (type === 'COMPLETED') {
      // Pleasant accomplishment chord: C5 -> G5 -> C6
      [523.25, 783.99, 1046.50].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + (i * 0.07));
        gain.gain.setValueAtTime(0.18, now + (i * 0.07));
        gain.gain.exponentialRampToValueAtTime(0.001, now + (i * 0.07) + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + (i * 0.07));
        osc.stop(now + (i * 0.07) + 0.45);
      });
      return;
    }

    if (type === 'HOURLY') {
      // Soft gentle 2-note chime
      [587.33, 880.00].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + (i * 0.15));
        gain.gain.setValueAtTime(0.14, now + (i * 0.15));
        gain.gain.exponentialRampToValueAtTime(0.001, now + (i * 0.15) + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + (i * 0.15));
        osc.stop(now + (i * 0.15) + 0.45);
      });
      return;
    }

    // EXACT_TIME: High-Quality Professional 4-Note Corporate Executive Chime (Eb Major Arpeggio)
    // Notes: Eb5 (622.25Hz), G5 (783.99Hz), Bb5 (932.33Hz), Eb6 (1244.50Hz)
    const melody = [
      { freq: 622.25, delay: 0.00, dur: 0.35, vol: 0.22 },
      { freq: 783.99, delay: 0.12, dur: 0.35, vol: 0.24 },
      { freq: 932.33, delay: 0.24, dur: 0.40, vol: 0.26 },
      { freq: 1244.50, delay: 0.38, dur: 0.70, vol: 0.28 }
    ];

    melody.forEach(({ freq, delay, dur, vol }) => {
      // Primary crystal sine wave
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(freq, now + delay);
      gain1.gain.setValueAtTime(vol, now + delay);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + delay + dur);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now + delay);
      osc1.stop(now + delay + dur + 0.05);

      // Warm acoustic overtone
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(freq * 2, now + delay);
      gain2.gain.setValueAtTime(vol * 0.22, now + delay);
      gain2.gain.exponentialRampToValueAtTime(0.0005, now + delay + (dur * 0.7));
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + delay);
      osc2.stop(now + delay + dur);
    });
  } catch (e) {
    console.warn('Audio reminder skipped:', e);
  }
}

/**
 * Intelligent helper to extract time from user-typed text (e.g. "Order 5:22pm", "Call 5:20 pm")
 */
export function extractTimeFromText(text?: string | null): string {
  if (!text) return '';
  // Match 12-hour: "5:22pm", "5:22 pm", "5pm", "11:30 am", "05:22 PM"
  const match1 = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
  if (match1) {
    let hours = parseInt(match1[1], 10);
    const minutes = match1[2] ? match1[2].padStart(2, '0') : '00';
    const ampm = match1[3].toUpperCase();
    if (hours > 12) hours = hours % 12;
    return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
  }
  // Match 24-hour / plain time: "17:22", "5:22"
  const match2 = text.match(/\b(\d{1,2}):(\d{2})\b/);
  if (match2) {
    let hours = parseInt(match2[1], 10);
    const minutes = match2[2];
    const ampm = (hours >= 1 && hours <= 7) || hours === 12 ? 'PM' : (hours >= 8 && hours <= 11) ? 'AM' : 'PM';
    return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
  }
  return '';
}

/**
 * Robust parser that turns any human or machine time string into minutes since midnight
 * e.g. "5:22 PM" -> 1042, "17:22" -> 1042, "05:22pm" -> 1042, "5.22 pm" -> 1042
 */
export function parseTimeToMinutes(timeStr?: string | null): number | null {
  if (!timeStr || !timeStr.trim()) return null;
  const clean = timeStr.trim().toLowerCase();

  // Match 12-hour or 24-hour: "5:22 pm", "17:22", "05:22pm", "5.22 pm"
  const match12 = clean.match(/^(\d{1,2})[:.](\d{2})\s*(am|pm)?$/);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = parseInt(match12[2], 10);
    const period = match12[3];

    if (period === 'pm' && hours < 12) hours += 12;
    if (period === 'am' && hours === 12) hours = 0;
    if (!period && hours >= 1 && hours <= 7) hours += 12; // Business hours assumption for 1..7
    return hours * 60 + minutes;
  }

  // Match simple hour "5 pm", "17", "5pm"
  const matchHour = clean.match(/^(\d{1,2})\s*(am|pm)$/);
  if (matchHour) {
    let hours = parseInt(matchHour[1], 10);
    const period = matchHour[2];
    if (period === 'pm' && hours < 12) hours += 12;
    if (period === 'am' && hours === 12) hours = 0;
    return hours * 60;
  }

  return null;
}

export function useProductivityReminder(
  userId?: number | null,
  onNotify?: (type: 'info' | 'success', message: string) => void,
  onTaskAlert?: (task: TodoItem) => void
) {
  const alertedTasksRef = useRef<Set<string>>(new Set());
  const snoozedUntilRef = useRef<Map<number, number>>(new Map());
  const dismissedTasksRef = useRef<Set<number>>(new Set());
  const completedTasksRef = useRef<Set<number>>(new Set());
  const lastHourlyAlertRef = useRef<number>(0);

  // Request browser desktop notification permission once on startup
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
    }
  }, []);

  useEffect(() => {
    const checkTasksAndRemind = async () => {
      try {
        const summary = await api.getTodoSummary(userId);
        if (!summary) return;

        const now = new Date();
        const nowMs = now.getTime();
        const currentHours = now.getHours();
        const currentMinutes = now.getMinutes();
        const nowTotalMinutes = currentHours * 60 + currentMinutes;
        const todayStr = now.toISOString().split('T')[0];

        // Gather all pending tasks from summary
        const allPendingPool: TodoItem[] = [];
        const seenIds = new Set<number>();

        const appendUnique = (arr?: TodoItem[]) => {
          if (!arr || !Array.isArray(arr)) return;
          for (const item of arr) {
            if (
              item && 
              item.id && 
              !seenIds.has(item.id) && 
              item.status !== 'COMPLETED' &&
              !completedTasksRef.current.has(item.id) &&
              !dismissedTasksRef.current.has(item.id)
            ) {
              seenIds.add(item.id);
              allPendingPool.push(item);
            }
          }
        };

        appendUnique(summary.exact_time_tasks);
        appendUnique(summary.tasks);
        appendUnique(summary.overdue_tasks);

        for (const task of allPendingPool) {
          if (task.status === 'COMPLETED' || completedTasksRef.current.has(task.id) || dismissedTasksRef.current.has(task.id)) {
            continue;
          }

          // Resolve effective due time
          const rawDue = (task.due_time || '').trim() || 
                         extractTimeFromText(task.title) || 
                         extractTimeFromText(task.description);
          if (!rawDue) continue;

          // Check if snoozed
          const snoozeExpiry = snoozedUntilRef.current.get(task.id);
          if (snoozeExpiry && nowMs < snoozeExpiry) {
            continue;
          }

          const taskDueMinutes = parseTimeToMinutes(rawDue);
          if (taskDueMinutes === null) continue;

          const taskKey = `${task.id}_${task.due_date || todayStr}_${rawDue}`;

          const isToday = !task.due_date || task.due_date === todayStr;
          const isOverdue = task.due_date && task.due_date < todayStr;

          // Trigger alert if current time has reached or passed task time
          if ((isToday && nowTotalMinutes >= taskDueMinutes) || isOverdue) {
            if (!alertedTasksRef.current.has(taskKey) || (snoozeExpiry && nowMs >= snoozeExpiry)) {
              alertedTasksRef.current.add(taskKey);
              snoozedUntilRef.current.delete(task.id);

              // Play Professional Melodic Audio Chime
              playNotificationChime('EXACT_TIME');

              // Trigger Desktop Native Notification
              if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                try {
                  new Notification(`⏰ કાર્ય સમય રીમાઇન્ડર: ${task.title}`, {
                    body: `સમય: ${rawDue} | ${task.list_category || 'General'}\nચાલુ કાર્ય પૂર્ણ કરવા ટેપ કરો.`,
                    icon: '/favicon.ico'
                  });
                } catch (e) {}
              }

              // Trigger Global Pop-up Modal Window
              if (onTaskAlert) {
                onTaskAlert({ ...task, due_time: rawDue });
              }

              // Toast feedback
              if (onNotify) {
                onNotify('info', `⏰ Task Due Now: "${task.title}" (${rawDue})`);
              }
            }
          }
        }

        // 2. Check Hourly Productivity Reminder (if >= 5 pending tasks for today)
        if (summary.pending >= 5) {
          if (!lastHourlyAlertRef.current || (nowMs - lastHourlyAlertRef.current) > 3600000) {
            lastHourlyAlertRef.current = nowMs;
            playNotificationChime('HOURLY');
            if (onNotify) {
              onNotify('info', `🔔 Productivity Check: You have ${summary.pending} pending tasks for today. Stay focused and check off your completed items!`);
            }
          }
        }
      } catch (err) {
        // Silently catch background errors
      }
    };

    // Initial check immediately
    checkTasksAndRemind();

    // Run high-frequency interval check every 3 seconds for pinpoint instant responsiveness
    const interval = setInterval(checkTasksAndRemind, 3000);
    return () => clearInterval(interval);
  }, [userId, onNotify, onTaskAlert]);

  // Helper to snooze a task for N minutes
  const snoozeTask = (taskId: number, minutes: number = 10) => {
    snoozedUntilRef.current.set(taskId, Date.now() + minutes * 60 * 1000);
    dismissedTasksRef.current.delete(taskId);
  };

  // Helper to dismiss task from re-alerting in current session
  const dismissTask = (taskId: number) => {
    dismissedTasksRef.current.add(taskId);
    snoozedUntilRef.current.delete(taskId);
  };

  // Helper to mark task completed and permanently stop alerts
  const markCompleted = (taskId: number) => {
    completedTasksRef.current.add(taskId);
    dismissedTasksRef.current.add(taskId);
    snoozedUntilRef.current.delete(taskId);
  };

  return { snoozeTask, dismissTask, markCompleted };
}
