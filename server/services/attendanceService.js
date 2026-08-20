import { getDatabase, runInTransaction } from '../database/connection.js';

export const attendanceService = {
  // ---------------------------------------------------------
  // BRANCHES
  // ---------------------------------------------------------
  getBranches() {
    const db = getDatabase();
    return db.prepare('SELECT * FROM branches WHERE active = 1 ORDER BY id ASC').all();
  },

  createBranch(data) {
    const db = getDatabase();
    const res = db.prepare(`
      INSERT INTO branches (name, code, pin, address, active)
      VALUES (?, ?, ?, ?, 1)
    `).run(
      data.name.trim(),
      data.code?.trim() || '',
      data.pin?.trim() || '1111',
      data.address?.trim() || ''
    );
    return db.prepare('SELECT * FROM branches WHERE id = ?').get(res.lastInsertRowid);
  },

  updateBranch(id, data) {
    const db = getDatabase();
    db.prepare(`
      UPDATE branches
      SET name = ?, code = ?, pin = ?, address = ?
      WHERE id = ?
    `).run(
      data.name.trim(),
      data.code?.trim() || '',
      data.pin?.trim() || '1111',
      data.address?.trim() || '',
      Number(id)
    );
    return db.prepare('SELECT * FROM branches WHERE id = ?').get(Number(id));
  },

  deleteBranch(id) {
    const db = getDatabase();
    db.prepare('UPDATE branches SET active = 0 WHERE id = ?').run(Number(id));
    return { success: true };
  },

  // ---------------------------------------------------------
  // EMPLOYEES
  // ---------------------------------------------------------
  getEmployees(filters = {}) {
    const db = getDatabase();
    let query = `
      SELECT e.*, b.name as branch_name, b.code as branch_code
      FROM employees e
      LEFT JOIN branches b ON e.branch_id = b.id
      WHERE e.active = 1
    `;
    const params = [];

    if (filters.branch_id) {
      query += ' AND e.branch_id = ?';
      params.push(Number(filters.branch_id));
    }
    if (filters.search) {
      query += ' AND (e.name LIKE ? OR e.phone LIKE ? OR e.designation LIKE ?)';
      const s = `%${filters.search}%`;
      params.push(s, s, s);
    }

    query += ' ORDER BY e.name ASC';
    return db.prepare(query).all(...params);
  },

  getEmployeeById(id) {
    const db = getDatabase();
    return db.prepare(`
      SELECT e.*, b.name as branch_name
      FROM employees e
      LEFT JOIN branches b ON e.branch_id = b.id
      WHERE e.id = ?
    `).get(Number(id));
  },

  createEmployee(data) {
    const db = getDatabase();
    const res = db.prepare(`
      INSERT INTO employees (branch_id, name, phone, designation, pin, aadhar_number, address, monthly_salary, daily_rate, join_date, active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
      Number(data.branch_id) || 1,
      data.name.trim(),
      data.phone?.trim() || '',
      data.designation?.trim() || 'Staff',
      data.pin?.trim() || '',
      data.aadhar_number?.trim() || '',
      data.address?.trim() || '',
      Number(data.monthly_salary) || 0.0,
      Number(data.daily_rate) || 0.0,
      data.join_date || new Date().toISOString().split('T')[0]
    );

    const empId = res.lastInsertRowid;
    if (Number(data.monthly_salary) > 0) {
      db.prepare(`
        INSERT INTO salary_history (employee_id, monthly_salary, effective_from)
        VALUES (?, ?, ?)
      `).run(empId, Number(data.monthly_salary), data.join_date || new Date().toISOString().split('T')[0]);
    }

    return this.getEmployeeById(empId);
  },

  updateEmployee(id, data) {
    const db = getDatabase();
    const existing = this.getEmployeeById(id);
    if (!existing) throw new Error('Employee not found');

    db.prepare(`
      UPDATE employees SET
        branch_id = ?, name = ?, phone = ?, designation = ?, pin = ?,
        aadhar_number = ?, address = ?, monthly_salary = ?, daily_rate = ?,
        join_date = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      Number(data.branch_id) || existing.branch_id,
      data.name?.trim() || existing.name,
      data.phone?.trim() ?? existing.phone,
      data.designation?.trim() ?? existing.designation,
      data.pin?.trim() ?? existing.pin,
      data.aadhar_number?.trim() ?? existing.aadhar_number,
      data.address?.trim() ?? existing.address,
      Number(data.monthly_salary !== undefined ? data.monthly_salary : existing.monthly_salary),
      Number(data.daily_rate !== undefined ? data.daily_rate : existing.daily_rate),
      data.join_date || existing.join_date,
      Number(id)
    );

    if (data.monthly_salary && Number(data.monthly_salary) !== existing.monthly_salary) {
      db.prepare(`
        INSERT INTO salary_history (employee_id, monthly_salary, effective_from)
        VALUES (?, ?, ?)
      `).run(Number(id), Number(data.monthly_salary), new Date().toISOString().split('T')[0]);
    }

    return this.getEmployeeById(id);
  },

  deleteEmployee(id) {
    const db = getDatabase();
    db.prepare('UPDATE employees SET active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(Number(id));
    return { success: true };
  },

  // ---------------------------------------------------------
  // ATTENDANCE MARKING
  // ---------------------------------------------------------
  getDailyAttendance(date = new Date().toISOString().split('T')[0], branchId = null) {
    const db = getDatabase();
    let query = `
      SELECT 
        e.id as employee_id,
        e.name,
        e.phone,
        e.designation,
        e.pin,
        e.branch_id,
        e.monthly_salary,
        b.name as branch_name,
        a.id as attendance_id,
        COALESCE(a.status, 'UNMARKED') as status,
        a.in_time,
        a.out_time,
        a.total_hours,
        a.notes
      FROM employees e
      LEFT JOIN branches b ON e.branch_id = b.id
      LEFT JOIN attendance a ON e.id = a.employee_id AND a.date = ?
      WHERE e.active = 1
    `;
    const params = [date];

    if (branchId) {
      query += ' AND e.branch_id = ?';
      params.push(Number(branchId));
    }

    query += ' ORDER BY e.name ASC';
    return db.prepare(query).all(...params);
  },

  markAttendance(employeeId, date, status, inTime = '', outTime = '', notes = '') {
    const db = getDatabase();
    const existing = db.prepare('SELECT id FROM attendance WHERE employee_id = ? AND date = ?').get(Number(employeeId), date);

    if (existing) {
      db.prepare(`
        UPDATE attendance
        SET status = ?, in_time = ?, out_time = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(status, inTime, outTime, notes, existing.id);
      return db.prepare('SELECT * FROM attendance WHERE id = ?').get(existing.id);
    } else {
      const res = db.prepare(`
        INSERT INTO attendance (employee_id, date, status, in_time, out_time, notes)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(Number(employeeId), date, status, inTime, outTime, notes);
      return db.prepare('SELECT * FROM attendance WHERE id = ?').get(res.lastInsertRowid);
    }
  },

  bulkMarkAttendance(records = [], date) {
    return runInTransaction((db) => {
      const targetDate = date || new Date().toISOString().split('T')[0];
      for (const r of records) {
        if (!r.employee_id || !r.status) continue;
        const existing = db.prepare('SELECT id FROM attendance WHERE employee_id = ? AND date = ?').get(Number(r.employee_id), targetDate);
        if (existing) {
          db.prepare(`
            UPDATE attendance SET status = ?, in_time = ?, out_time = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(r.status, r.in_time || '', r.out_time || '', r.notes || '', existing.id);
        } else {
          db.prepare(`
            INSERT INTO attendance (employee_id, date, status, in_time, out_time, notes)
            VALUES (?, ?, ?, ?, ?, ?)
          `).run(Number(r.employee_id), targetDate, r.status, r.in_time || '', r.out_time || '', r.notes || '');
        }
      }
      return { success: true, count: records.length };
    });
  },

  // ---------------------------------------------------------
  // ADVANCES (ખર્ચી / એડવાન્સ ઉપાડ)
  // ---------------------------------------------------------
  getAdvances(filters = {}) {
    const db = getDatabase();
    let query = `
      SELECT a.*, e.name as employee_name, e.designation, e.branch_id, b.name as branch_name
      FROM employee_advances a
      JOIN employees e ON a.employee_id = e.id
      LEFT JOIN branches b ON e.branch_id = b.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.employee_id) {
      query += ' AND a.employee_id = ?';
      params.push(Number(filters.employee_id));
    }
    if (filters.startDate && filters.endDate) {
      query += ' AND a.date BETWEEN ? AND ?';
      params.push(filters.startDate, filters.endDate);
    }

    query += ' ORDER BY a.date DESC, a.id DESC';
    return db.prepare(query).all(...params);
  },

  createAdvance(data, username = 'Admin') {
    return runInTransaction((db) => {
      const emp = db.prepare('SELECT * FROM employees WHERE id = ?').get(Number(data.employee_id));
      if (!emp) throw new Error('Employee not found');

      const amount = Number(data.amount);
      if (amount <= 0) throw new Error('Advance amount must be greater than 0');

      const advanceDate = data.date || new Date().toISOString().split('T')[0];

      const res = db.prepare(`
        INSERT INTO employee_advances (employee_id, date, amount, payment_mode, note, status, created_by)
        VALUES (?, ?, ?, ?, ?, 'PAID', ?)
      `).run(
        emp.id,
        advanceDate,
        amount,
        data.payment_mode || 'CASH',
        data.note || 'Salary Advance / Kharchi',
        username
      );

      const advanceId = res.lastInsertRowid;

      // Double-entry record in Cash / Bank ledger
      db.prepare(`
        INSERT INTO ledger_entries (entry_date, party_type, party_id, party_name, voucher_type, voucher_id, voucher_no, debit_amount, credit_amount, notes)
        VALUES (?, 'EXPENSE', 0, 'Staff Salary Advance', 'PAYMENT_OUT', ?, ?, 0.0, ?, ?)
      `).run(
        advanceDate,
        advanceId,
        `ADV-${String(advanceId).padStart(3, '0')}`,
        amount,
        `Salary Advance / Kharchi to ${emp.name} (${data.payment_mode || 'CASH'})`
      );

      return db.prepare('SELECT * FROM employee_advances WHERE id = ?').get(advanceId);
    });
  },

  deleteAdvance(id) {
    const db = getDatabase();
    db.prepare("DELETE FROM ledger_entries WHERE voucher_type = 'PAYMENT_OUT' AND voucher_id = ?").run(Number(id));
    db.prepare('DELETE FROM employee_advances WHERE id = ?').run(Number(id));
    return { success: true };
  },

  // ---------------------------------------------------------
  // MONTHLY SALARY & HISAB CALCULATION
  // ---------------------------------------------------------
  calculateMonthlySalaryReport(month, year, branchId = null) {
    const db = getDatabase();
    const employees = this.getEmployees(branchId ? { branch_id: branchId } : {});

    const numYear = Number(year) || new Date().getFullYear();
    const numMonth = Number(month) || (new Date().getMonth() + 1);

    const startDate = `${numYear}-${String(numMonth).padStart(2, '0')}-01`;
    const daysInMonth = new Date(numYear, numMonth, 0).getDate();
    const endDate = `${numYear}-${String(numMonth).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

    const report = [];

    for (const emp of employees) {
      const attendanceRows = db.prepare(`
        SELECT status, COUNT(*) as count
        FROM attendance
        WHERE employee_id = ? AND date BETWEEN ? AND ?
        GROUP BY status
      `).all(emp.id, startDate, endDate);

      let presentDays = 0;
      let absentDays = 0;
      let halfDays = 0;
      let leaveDays = 0;

      for (const row of attendanceRows) {
        if (row.status === 'P') presentDays = row.count;
        else if (row.status === 'A') absentDays = row.count;
        else if (row.status === 'H') halfDays = row.count;
        else if (row.status === 'L') leaveDays = row.count;
      }

      const totalWorkedDays = presentDays + (halfDays * 0.5);
      const monthlySalary = Number(emp.monthly_salary || 0);
      const perDayRate = monthlySalary > 0 ? (monthlySalary / daysInMonth) : Number(emp.daily_rate || 0);
      const grossEarned = Math.round(totalWorkedDays * perDayRate * 100) / 100;

      // Fetch advances taken this month
      const advancesSum = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM employee_advances
        WHERE employee_id = ? AND date BETWEEN ? AND ?
      `).get(emp.id, startDate, endDate).total;

      const netPayable = Math.max(0, Math.round((grossEarned - advancesSum) * 100) / 100);

      report.push({
        employee_id: emp.id,
        name: emp.name,
        phone: emp.phone,
        designation: emp.designation,
        branch_name: emp.branch_name,
        monthly_salary: monthlySalary,
        days_in_month: daysInMonth,
        present_days: presentDays,
        absent_days: absentDays,
        half_days: halfDays,
        leave_days: leaveDays,
        total_worked_days: totalWorkedDays,
        gross_earned: grossEarned,
        total_advances: advancesSum,
        net_payable: netPayable
      });
    }

    return {
      month: numMonth,
      year: numYear,
      start_date: startDate,
      end_date: endDate,
      days_in_month: daysInMonth,
      report
    };
  },

  // ---------------------------------------------------------
  // SETTINGS & PIN VERIFICATION
  // ---------------------------------------------------------
  getSettings() {
    const db = getDatabase();
    return db.prepare('SELECT * FROM attendance_settings WHERE id = 1').get() || {
      id: 1,
      master_pin: '9999',
      company_name: 'Matuki Sweets & Snacks',
      salary_cycle_day: 15
    };
  },

  updateSettings(data) {
    const db = getDatabase();
    db.prepare(`
      UPDATE attendance_settings
      SET master_pin = ?, company_name = ?, salary_cycle_day = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `).run(
      data.master_pin || '9999',
      data.company_name || 'Matuki Sweets & Snacks',
      Number(data.salary_cycle_day) || 15
    );
    return this.getSettings();
  },

  verifyPin(pin, branchId = null) {
    const db = getDatabase();
    const settings = this.getSettings();

    // Master Admin PIN check
    if (pin === settings.master_pin) {
      return { success: true, role: 'ADMIN', name: 'Master Admin' };
    }

    // Branch PIN check
    if (branchId) {
      const branch = db.prepare('SELECT * FROM branches WHERE id = ? AND pin = ?').get(Number(branchId), pin);
      if (branch) {
        return { success: true, role: 'BRANCH', name: branch.name };
      }
    }

    // Employee PIN check
    const emp = db.prepare('SELECT * FROM employees WHERE pin = ? AND active = 1').get(pin);
    if (emp) {
      return { success: true, role: 'EMPLOYEE', employee: emp };
    }

    return { success: false, message: 'Invalid PIN entered' };
  }
};
