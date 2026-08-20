import { getDatabase } from '../database/connection.js';

export const goalService = {
  // Get Goal & Live Progress for a given year (defaults to current year e.g. 2026 or 2026-27)
  getGoals(yearParam) {
    const db = getDatabase();
    const currentYearStr = String(new Date().getFullYear());
    const year = yearParam || currentYearStr;

    // 1. Fetch or create default goal record
    let goal = db.prepare('SELECT * FROM sales_goals WHERE year = ?').get(year);
    if (!goal) {
      // Default initial goal: 50 Lakhs annual target with default split
      const defaultAnnual = 5000000;
      const defaultMonthly = {
        "1": 350000, "2": 350000, "3": 450000,
        "4": 400000, "5": 400000, "6": 350000,
        "7": 350000, "8": 550000, "9": 450000,
        "10": 700000, "11": 600000, "12": 450000
      };
      
      const insertStmt = db.prepare(`
        INSERT INTO sales_goals (year, annual_target, monthly_targets, notes)
        VALUES (?, ?, ?, ?)
      `);
      insertStmt.run(year, defaultAnnual, JSON.stringify(defaultMonthly), 'Annual Business Growth Target');
      goal = db.prepare('SELECT * FROM sales_goals WHERE year = ?').get(year);
    }

    let monthlyTargets = {};
    try {
      monthlyTargets = typeof goal.monthly_targets === 'string' ? JSON.parse(goal.monthly_targets) : (goal.monthly_targets || {});
    } catch (e) {
      monthlyTargets = {};
    }

    // 2. Query Live Actual Sales for the Year
    const yearPattern = `${year}%`;
    const totalAchievedRow = db.prepare(`
      SELECT COALESCE(SUM(grand_total), 0) as total_achieved, COUNT(id) as total_invoices
      FROM sales
      WHERE status != 'CANCELLED' AND (date LIKE ? OR strftime('%Y', date) = ?)
    `).get(yearPattern, year);

    const totalAchieved = totalAchievedRow?.total_achieved || 0;
    const totalInvoices = totalAchievedRow?.total_invoices || 0;
    const annualTarget = Number(goal.annual_target) || 0;

    // 3. Query Live Actual Sales Month by Month (1 to 12)
    const monthlySalesRows = db.prepare(`
      SELECT 
        CAST(strftime('%m', date) AS INTEGER) as month_num,
        COALESCE(SUM(grand_total), 0) as month_achieved,
        COUNT(id) as month_invoices
      FROM sales
      WHERE status != 'CANCELLED' AND (date LIKE ? OR strftime('%Y', date) = ?)
      GROUP BY strftime('%m', date)
    `).all(yearPattern, year);

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const monthlyBreakdown = [];
    const currentMonthNum = new Date().getMonth() + 1; // 1-12

    for (let m = 1; m <= 12; m++) {
      const monthRow = monthlySalesRows.find(r => r.month_num === m);
      const achieved = monthRow ? Number(monthRow.month_achieved) : 0;
      const invoices = monthRow ? Number(monthRow.month_invoices) : 0;
      const target = Number(monthlyTargets[String(m)]) || 0;
      const achievedPercent = target > 0 ? Math.min(999, Math.round((achieved / target) * 100)) : (achieved > 0 ? 100 : 0);
      const remaining = Math.max(0, target - achieved);

      monthlyBreakdown.push({
        month_num: m,
        month_name: monthNames[m - 1],
        target,
        achieved,
        achieved_percent: achievedPercent,
        remaining,
        invoices,
        is_current_month: m === currentMonthNum
      });
    }

    const currentMonthData = monthlyBreakdown.find(m => m.month_num === currentMonthNum) || monthlyBreakdown[0];

    const annualAchievedPercent = annualTarget > 0 ? Math.round((totalAchieved / annualTarget) * 1000) / 10 : (totalAchieved > 0 ? 100 : 0);
    const annualRemaining = Math.max(0, annualTarget - totalAchieved);
    const annualRemainingPercent = Math.max(0, Math.round((100 - annualAchievedPercent) * 10) / 10);

    return {
      year: goal.year,
      annual_target: annualTarget,
      total_achieved: totalAchieved,
      achieved_percent: annualAchievedPercent,
      remaining_amount: annualRemaining,
      remaining_percent: annualRemainingPercent,
      total_invoices: totalInvoices,
      current_month: currentMonthData,
      monthly_breakdown: monthlyBreakdown,
      notes: goal.notes || '',
      updated_at: goal.updated_at
    };
  },

  // Save Goal Configuration
  saveGoals(data) {
    const db = getDatabase();
    const year = String(data.year || new Date().getFullYear());
    const annualTarget = Number(data.annual_target) || 0;
    const monthlyTargets = typeof data.monthly_targets === 'object' ? JSON.stringify(data.monthly_targets) : String(data.monthly_targets || '{}');
    const notes = String(data.notes || '');

    const existing = db.prepare('SELECT id FROM sales_goals WHERE year = ?').get(year);
    if (existing) {
      db.prepare(`
        UPDATE sales_goals 
        SET annual_target = ?, monthly_targets = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
        WHERE year = ?
      `).run(annualTarget, monthlyTargets, notes, year);
    } else {
      db.prepare(`
        INSERT INTO sales_goals (year, annual_target, monthly_targets, notes)
        VALUES (?, ?, ?, ?)
      `).run(year, annualTarget, monthlyTargets, notes);
    }

    return this.getGoals(year);
  }
};
