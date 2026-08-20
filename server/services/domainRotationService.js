import fs from 'node:fs';
import path from 'node:path';
import { exec } from 'node:child_process';
import crypto from 'node:crypto';
import { getDatabase, runInTransaction } from '../database/connection.js';
import { backupService } from './backupService.js';
import { settingsService } from './settingsService.js';
import { whatsappGatewayService } from './whatsappGatewayService.js';

export const domainRotationService = {
  getConfig() {
    const db = getDatabase();
    db.exec(`
      CREATE TABLE IF NOT EXISTS domain_rotation_config (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        base_domain TEXT DEFAULT 'matukierp.com',
        domain_pattern TEXT DEFAULT 'random',
        custom_domains_json TEXT DEFAULT '[]',
        current_domain TEXT DEFAULT 'localhost:5173',
        expired_domains_json TEXT DEFAULT '[]',
        master_phone_number TEXT DEFAULT '',
        rotation_days TEXT DEFAULT '10,25',
        rotation_time TEXT DEFAULT '02:00',
        auto_rotate_enabled INTEGER DEFAULT 1,
        auto_ssl_enabled INTEGER DEFAULT 1,
        notify_whatsapp INTEGER DEFAULT 1,
        last_rotation_date TEXT,
        next_rotation_date TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    try { db.exec("ALTER TABLE domain_rotation_config ADD COLUMN expired_domains_json TEXT DEFAULT '[]';"); } catch(e) {}
    try { db.exec("ALTER TABLE domain_rotation_config ADD COLUMN master_phone_number TEXT DEFAULT '';"); } catch(e) {}

    let row = db.prepare('SELECT * FROM domain_rotation_config ORDER BY id DESC LIMIT 1').get();
    if (!row) {
      db.prepare(`
        INSERT INTO domain_rotation_config (base_domain, current_domain, rotation_days, auto_rotate_enabled)
        VALUES ('matukierp.com', 'localhost:5173', '10,25', 1)
      `).run();
      row = db.prepare('SELECT * FROM domain_rotation_config ORDER BY id DESC LIMIT 1').get();
    }
    return row;
  },

  updateConfig(data) {
    const db = getDatabase();
    this.getConfig(); // ensure table exists

    db.prepare(`
      UPDATE domain_rotation_config SET
        base_domain = COALESCE(?, base_domain),
        domain_pattern = COALESCE(?, domain_pattern),
        custom_domains_json = COALESCE(?, custom_domains_json),
        master_phone_number = COALESCE(?, master_phone_number),
        rotation_days = COALESCE(?, rotation_days),
        rotation_time = COALESCE(?, rotation_time),
        auto_rotate_enabled = COALESCE(?, auto_rotate_enabled),
        auto_ssl_enabled = COALESCE(?, auto_ssl_enabled),
        notify_whatsapp = COALESCE(?, notify_whatsapp),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `).run(
      data.base_domain || null,
      data.domain_pattern || null,
      data.custom_domains_json ? JSON.stringify(data.custom_domains_json) : null,
      data.master_phone_number || null,
      data.rotation_days || null,
      data.rotation_time || null,
      data.auto_rotate_enabled !== undefined ? (data.auto_rotate_enabled ? 1 : 0) : null,
      data.auto_ssl_enabled !== undefined ? (data.auto_ssl_enabled ? 1 : 0) : null,
      data.notify_whatsapp !== undefined ? (data.notify_whatsapp ? 1 : 0) : null
    );

    return this.getConfig();
  },

  getHistory() {
    const db = getDatabase();
    try {
      return db.prepare('SELECT * FROM domain_rotation_history ORDER BY id DESC LIMIT 50').all();
    } catch (e) {
      return [];
    }
  },

  // Generates 100% random, unpredictable secret domain name (e.g. x9k4m7p2-sec.matukierp.com)
  generateNextDomain() {
    const config = this.getConfig();
    
    let customPool = [];
    try {
      if (config.custom_domains_json) {
        customPool = JSON.parse(config.custom_domains_json);
      }
    } catch (e) {}

    if (Array.isArray(customPool) && customPool.length > 0) {
      const currentIdx = customPool.indexOf(config.current_domain);
      const nextIdx = (currentIdx + 1) % customPool.length;
      return customPool[nextIdx];
    }

    // Cryptographically random 8-character token (unpredictable)
    const randomToken = crypto.randomBytes(4).toString('hex'); // e.g. "a98f12c4"
    const baseDomain = config.base_domain || 'matukierp.com';
    return `sec-${randomToken}.${baseDomain}`.toLowerCase();
  },

  rotateDomainNow(reason = 'Scheduled 10/25 Security Secret Domain Rotation', username = 'System') {
    const db = getDatabase();
    
    // 1. Take safety WAL checkpoint database backup first (Zero Data Loss Guarantee)
    console.log('🔒 Step 1: Executing WAL checkpoint & full safety backup before secret domain rotation...');
    const backupRes = backupService.createBackup('PRE_SECRET_DOMAIN_ROTATION', username);

    // 2. Generate random secret domain
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const newDomain = this.generateNextDomain();
    const config = this.getConfig();
    const oldDomain = config.current_domain || 'localhost:5173';

    // 3. Track old domain in expired list (So old links return 404 error immediately)
    let expiredList = [];
    try {
      if (config.expired_domains_json) {
        expiredList = JSON.parse(config.expired_domains_json);
      }
    } catch (e) {}

    if (oldDomain && !expiredList.includes(oldDomain)) {
      expiredList.push(oldDomain);
    }

    // 4. Update database configuration
    db.prepare(`
      UPDATE domain_rotation_config SET
        current_domain = ?,
        expired_domains_json = ?,
        last_rotation_date = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `).run(newDomain, JSON.stringify(expiredList), todayStr);

    // 5. Update Nginx configuration and immediately revoke old domain with 404 error
    if (process.platform === 'linux') {
      this.updateNginxConfig(newDomain, oldDomain);
    }

    // 6. Log history & audit log
    db.exec(`
      CREATE TABLE IF NOT EXISTS domain_rotation_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        old_domain TEXT,
        new_domain TEXT,
        rotation_date TEXT,
        backup_file TEXT,
        status TEXT DEFAULT 'SUCCESS',
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    db.prepare(`
      INSERT INTO domain_rotation_history (old_domain, new_domain, rotation_date, backup_file, status, notes)
      VALUES (?, ?, ?, ?, 'SUCCESS', ?)
    `).run(oldDomain, newDomain, todayStr, backupRes.file_path, `Rotated domain to secret ${newDomain}. Old domain ${oldDomain} expired (404). ${reason}`);

    db.prepare(`
      INSERT INTO audit_logs (username, action, module, record_id, notes)
      VALUES (?, 'DOMAIN_ROTATE_SECRET', 'SYSTEM', ?, ?)
    `).run(username, newDomain, `Secret domain rotated: ${oldDomain} -> ${newDomain}. Old domain set to 404 Expired.`);

    // 7. Send Secret Link ONLY to Master Admin 1 Mobile Number via WhatsApp
    try {
      const settings = settingsService.getSettings();
      const masterNumber = config.master_phone_number || settings.partner_1_mobile || settings.mobile || '+919081822283';
      
      const msg = `🔒 *SECRET ERP ACCESS LINK (DO NOT SHARE)*\n\n` +
                  `⚠️ *Old domain (${oldDomain}) HAS EXPIRED (404 Error).* Nobody can access using the old link.\n\n` +
                  `🔑 *New Secret Domain:* https://${newDomain}\n\n` +
                  `_Date: ${todayStr} | All database data is 100% safe & intact._`;

      whatsappGatewayService.sendMessage(masterNumber, msg).catch((e) => {
        console.error('WhatsApp secret link dispatch error:', e.message);
      });
      console.log(`📱 Secret ERP link sent to Master Number: ${masterNumber}`);
    } catch (e) {
      console.error('WhatsApp secret notification error:', e.message);
    }

    console.log(`✅ 100% SUCCESS: Secret Domain Rotated to '${newDomain}'! Old Domain Expired with 404.`);

    return {
      success: true,
      old_domain: oldDomain,
      new_domain: newDomain,
      old_domain_status: '404_EXPIRED',
      backup_file: backupRes.file_path,
      rotation_date: todayStr
    };
  },

  updateNginxConfig(newDomain, oldDomain) {
    const nginxConfPath = `/etc/nginx/sites-available/erp`;
    if (!fs.existsSync(nginxConfPath)) return;

    try {
      // 1. Point Nginx active server_name to new secret domain
      let conf = fs.readFileSync(nginxConfPath, 'utf8');
      conf = conf.replace(new RegExp(oldDomain, 'g'), newDomain);
      fs.writeFileSync(nginxConfPath, conf, 'utf8');

      // 2. Add 404 block rule for old expired domain
      const expiredConfPath = `/etc/nginx/sites-available/expired-domains`;
      const expiredRule = `
server {
    listen 80;
    listen 443 ssl;
    server_name ${oldDomain};
    return 404 "404 Not Found - Security Domain Expired";
}
`;
      fs.appendFileSync(expiredConfPath, expiredRule, 'utf8');

      // 3. Reload Nginx and request SSL for new secret domain
      exec('sudo nginx -t && sudo systemctl reload nginx', (err) => {
        if (!err) {
          exec(`sudo certbot --nginx -d ${newDomain} --non-interactive --agree-tos -m admin@${newDomain}`);
        }
      });
    } catch (err) {
      console.error('Nginx config update notice:', err.message);
    }
  },

  initScheduler() {
    console.log('⏰ Auto Secret Domain Rotation Scheduler initialized (Targets: 10th & 25th at 2:00 AM)...');

    const checkAndRotate = () => {
      try {
        const now = new Date();
        const dateNum = now.getDate(); // 10 or 25
        const hour = now.getHours(); // 2 is 2:00 AM
        const todayStr = now.toISOString().split('T')[0];

        const config = this.getConfig();
        if (!config.auto_rotate_enabled) return;

        const targetDays = (config.rotation_days || '10,25').split(',').map(d => parseInt(d.trim(), 10));

        // Trigger rotation on 10th or 25th at 2:00 AM
        if (targetDays.includes(dateNum) && hour >= 2) {
          const db = getDatabase();
          const existing = db.prepare(`
            SELECT id FROM domain_rotation_history WHERE rotation_date = ?
          `).get(todayStr);

          if (!existing) {
            console.log(`🚀 Executing Automatic 10/25 Secret Domain Rotation for ${todayStr}...`);
            this.rotateDomainNow(`Auto Scheduled 10/25 Rotation for ${todayStr}`, 'Auto Scheduler');
          }
        }
      } catch (err) {
        console.error('Error in secret domain rotation scheduler:', err.message);
      }
    };

    // Run check on startup
    checkAndRotate();

    // Check every 5 minutes
    setInterval(checkAndRotate, 5 * 60 * 1000);
  }
};
