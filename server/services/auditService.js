import { getDatabase } from '../database/connection.js';
import { hashPassword, verifyPassword, DEFAULT_ROLE_PERMISSIONS } from '../database/migrations.js';

function normalizePermissions(perms, role, username) {
  const result = {};
  const defaults = DEFAULT_ROLE_PERMISSIONS[role] || DEFAULT_ROLE_PERMISSIONS.CASHIER;

  const allModules = [
    'dashboard', 'sales', 'advance_orders', 'customers', 'suppliers',
    'products', 'purchases', 'expenses', 'rojmel', 'reports',
    'google_sheet_pnl', 'attendance', 'todos', 'settings', 'backup'
  ];

  for (const mod of allModules) {
    if (username === 'admin' || role === 'ADMIN') {
      result[mod] = 'FULL';
      continue;
    }

    const val = perms ? perms[mod] : undefined;
    if (val === true || val === 'FULL') {
      result[mod] = 'FULL';
    } else if (val === 'EDIT') {
      result[mod] = 'EDIT';
    } else if (val === 'VIEW') {
      result[mod] = 'VIEW';
    } else if (val === false || val === 'NONE') {
      result[mod] = 'NONE';
    } else {
      result[mod] = defaults[mod] || 'NONE';
    }
  }

  return result;
}

export const auditService = {
  // User login
  login(username, password) {
    const db = getDatabase();
    const user = db.prepare('SELECT * FROM users WHERE username = ? AND active = 1').get(username);
    if (!user) {
      throw new Error('Invalid username or user is inactive');
    }

    const isValid = verifyPassword(password, user.password_hash, user.salt);
    if (!isValid) {
      throw new Error('Invalid password');
    }

    // Parse granular permissions
    let rawPermissions = null;
    try {
      if (user.permissions && user.permissions !== '{}') {
        rawPermissions = JSON.parse(user.permissions);
      }
    } catch (e) {}

    const permissions = normalizePermissions(rawPermissions, user.role, user.username);

    // Log login action
    db.prepare(`
      INSERT INTO audit_logs (user_id, username, action, module, record_id, notes)
      VALUES (?, ?, 'LOGIN', 'AUTH', ?, 'User logged in successfully')
    `).run(user.id, user.username, String(user.id));

    return {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      role: user.role,
      mobile: user.mobile || '',
      permissions
    };
  },

  getUsers() {
    const db = getDatabase();
    const rows = db.prepare('SELECT id, username, full_name, role, active, mobile, permissions, created_at FROM users ORDER BY id ASC').all();
    return rows.map(u => {
      let rawPerms = null;
      try {
        if (u.permissions && u.permissions !== '{}') {
          rawPerms = JSON.parse(u.permissions);
        }
      } catch (e) {}
      
      const perms = normalizePermissions(rawPerms, u.role, u.username);
      return {
        ...u,
        permissions: perms
      };
    });
  },

  createUser(data, currentAdmin = 'Admin') {
    const db = getDatabase();
    const { hash, salt } = hashPassword(data.password);

    let permissionsJson = '{}';
    if (data.permissions && typeof data.permissions === 'object') {
      permissionsJson = JSON.stringify(data.permissions);
    } else {
      permissionsJson = JSON.stringify(DEFAULT_ROLE_PERMISSIONS[data.role || 'CASHIER'] || DEFAULT_ROLE_PERMISSIONS.CASHIER);
    }

    const res = db.prepare(`
      INSERT INTO users (username, password_hash, salt, full_name, role, mobile, permissions, active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.username.toLowerCase().trim(),
      hash,
      salt,
      data.full_name.trim(),
      data.role || 'CASHIER',
      data.mobile || '',
      permissionsJson,
      data.active !== undefined ? (data.active ? 1 : 0) : 1
    );

    const newId = res.lastInsertRowid;
    db.prepare(`
      INSERT INTO audit_logs (username, action, module, record_id, notes)
      VALUES (?, 'CREATE', 'USERS', ?, ?)
    `).run(currentAdmin, String(newId), `Created new user: ${data.username} (${data.role})`);

    return { 
      id: newId, 
      username: data.username, 
      full_name: data.full_name, 
      role: data.role,
      permissions: typeof data.permissions === 'object' ? data.permissions : JSON.parse(permissionsJson)
    };
  },

  updateUser(id, data, currentAdmin = 'Admin') {
    const db = getDatabase();
    const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!existing) {
      throw new Error('User not found');
    }

    let permissionsJson = existing.permissions;
    if (data.permissions && typeof data.permissions === 'object') {
      permissionsJson = JSON.stringify(data.permissions);
    }

    if (data.password && data.password.trim()) {
      const { hash, salt } = hashPassword(data.password.trim());
      db.prepare(`
        UPDATE users 
        SET full_name = ?, role = ?, mobile = ?, permissions = ?, active = ?, password_hash = ?, salt = ?
        WHERE id = ?
      `).run(
        data.full_name !== undefined ? data.full_name.trim() : existing.full_name,
        data.role || existing.role,
        data.mobile !== undefined ? data.mobile.trim() : (existing.mobile || ''),
        permissionsJson,
        data.active !== undefined ? (data.active ? 1 : 0) : existing.active,
        hash,
        salt,
        id
      );
    } else {
      db.prepare(`
        UPDATE users 
        SET full_name = ?, role = ?, mobile = ?, permissions = ?, active = ?
        WHERE id = ?
      `).run(
        data.full_name !== undefined ? data.full_name.trim() : existing.full_name,
        data.role || existing.role,
        data.mobile !== undefined ? data.mobile.trim() : (existing.mobile || ''),
        permissionsJson,
        data.active !== undefined ? (data.active ? 1 : 0) : existing.active,
        id
      );
    }

    db.prepare(`
      INSERT INTO audit_logs (username, action, module, record_id, notes)
      VALUES (?, 'UPDATE', 'USERS', ?, ?)
    `).run(currentAdmin, String(id), `Updated user permissions/details: ${existing.username}`);

    return { id, success: true };
  },

  deleteUser(id, currentAdmin = 'Admin') {
    const db = getDatabase();
    const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!existing) throw new Error('User not found');
    if (existing.username === 'admin') throw new Error('Cannot delete master Admin account');

    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    db.prepare(`
      INSERT INTO audit_logs (username, action, module, record_id, notes)
      VALUES (?, 'DELETE', 'USERS', ?, ?)
    `).run(currentAdmin, String(id), `Deleted user: ${existing.username}`);

    return { success: true };
  },

  getAuditLogs(limit = 100) {
    const db = getDatabase();
    return db.prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT ?').all(limit);
  }
};
