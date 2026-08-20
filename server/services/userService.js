import { getDatabase } from '../database/connection.js';
import { hashPassword } from '../database/migrations.js';

export const userService = {
  // Get all users (sanitized, no password hashes)
  getAllUsers() {
    const db = getDatabase();
    return db.prepare(`
      SELECT id, username, full_name, role, mobile, active, created_at, last_login
      FROM users
      ORDER BY id ASC
    `).all();
  },

  // Get single user by ID
  getUserById(id) {
    const db = getDatabase();
    return db.prepare(`
      SELECT id, username, full_name, role, mobile, active, created_at, last_login
      FROM users
      WHERE id = ?
    `).get(id);
  },

  // Create new user / team member
  createUser(data) {
    const db = getDatabase();
    if (!data.username || !data.username.trim()) {
      throw new Error('Username is required');
    }
    if (!data.password || !data.password.trim()) {
      throw new Error('Password is required');
    }

    const username = data.username.trim().toLowerCase();
    const existing = db.prepare('SELECT id FROM users WHERE LOWER(username) = ?').get(username);
    if (existing) {
      throw new Error(`Username "${username}" is already taken`);
    }

    const fullName = (data.full_name || username).trim();
    const role = data.role || 'CASHIER';
    const mobile = (data.mobile || '').trim();
    const { hash, salt } = hashPassword(data.password.trim());

    const stmt = db.prepare(`
      INSERT INTO users (username, password_hash, salt, full_name, role, mobile, active)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `);

    const result = stmt.run(username, hash, salt, fullName, role, mobile);
    return this.getUserById(result.lastInsertRowid);
  },

  // Update user
  updateUser(id, data) {
    const db = getDatabase();
    const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!existing) throw new Error('User not found');

    if (data.username && data.username.trim()) {
      const username = data.username.trim().toLowerCase();
      const duplicate = db.prepare('SELECT id FROM users WHERE LOWER(username) = ? AND id != ?').get(username, id);
      if (duplicate) {
        throw new Error(`Username "${username}" is already taken`);
      }
    }

    const username = data.username !== undefined ? data.username.trim().toLowerCase() : existing.username;
    const fullName = data.full_name !== undefined ? data.full_name.trim() : existing.full_name;
    const role = data.role !== undefined ? data.role : existing.role;
    const mobile = data.mobile !== undefined ? data.mobile.trim() : existing.mobile;
    const active = data.active !== undefined ? (data.active ? 1 : 0) : existing.active;

    let hash = existing.password_hash;
    let salt = existing.salt;

    if (data.password && data.password.trim()) {
      const hashed = hashPassword(data.password.trim());
      hash = hashed.hash;
      salt = hashed.salt;
    }

    db.prepare(`
      UPDATE users
      SET username = ?, full_name = ?, role = ?, mobile = ?, active = ?, password_hash = ?, salt = ?
      WHERE id = ?
    `).run(username, fullName, role, mobile, active, hash, salt, id);

    return this.getUserById(id);
  },

  // Delete user (prevent deleting primary admin id 1)
  deleteUser(id) {
    const db = getDatabase();
    if (Number(id) === 1) {
      throw new Error('The primary admin user cannot be deleted');
    }
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    return { success: true, message: 'User deleted successfully' };
  }
};
