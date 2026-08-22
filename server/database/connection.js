import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

// Resolve database directory in local ./data or %LOCALAPPDATA%/Matuki Business ERP/data
function getDatabasePath() {
  if (process.env.MATUKI_DB_PATH) {
    return process.env.MATUKI_DB_PATH;
  }

  // 1. Check production server /var/www/erp/data/matuki.db first
  const serverDb = '/var/www/erp/data/matuki.db';
  if (fs.existsSync(serverDb)) {
    return serverDb;
  }

  // 2. Check local ./data/matuki.db in current working directory (portable mode)
  const localDir = path.join(process.cwd(), 'data');
  const localDb = path.join(localDir, 'matuki.db');
  if (fs.existsSync(localDb)) {
    return localDb;
  }

  const isWindows = process.platform === 'win32';
  const localAppData = isWindows ? (process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local')) : path.join(os.homedir(), '.matuki-erp');
  const baseDir = path.join(localAppData, 'Matuki Business ERP', 'data');

  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }

  return path.join(baseDir, 'matuki.db');
}

export const DB_PATH = getDatabasePath();

let dbInstance = null;

export function getDatabase() {
  if (!dbInstance) {
    dbInstance = new DatabaseSync(DB_PATH);
    // Enable foreign keys, WAL mode, memory cache and mmap for ultra-fast query execution
    dbInstance.exec('PRAGMA foreign_keys = ON;');
    dbInstance.exec('PRAGMA journal_mode = WAL;');
    dbInstance.exec('PRAGMA synchronous = NORMAL;');
    dbInstance.exec('PRAGMA cache_size = -64000;');
    dbInstance.exec('PRAGMA temp_store = MEMORY;');
    dbInstance.exec('PRAGMA mmap_size = 268435456;');

    // Safe column migrations for advance order items vasan tracking
    try { dbInstance.exec("ALTER TABLE advance_order_items ADD COLUMN vasan_type TEXT DEFAULT 'NONE';"); } catch (e) {}
    try { dbInstance.exec("ALTER TABLE advance_order_items ADD COLUMN vasan_qty REAL DEFAULT 0;"); } catch (e) {}
  }
  return dbInstance;
}

export function closeDatabase() {
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch (err) {
      console.error('Error closing database:', err);
    }
    dbInstance = null;
  }
}

export function runInTransaction(callback) {
  const db = getDatabase();
  db.exec('BEGIN TRANSACTION;');
  try {
    const result = callback(db);
    db.exec('COMMIT;');
    return result;
  } catch (error) {
    db.exec('ROLLBACK;');
    throw error;
  }
}
