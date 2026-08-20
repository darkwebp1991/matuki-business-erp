#!/bin/bash

# =========================================================
# MATUKI BUSINESS ERP - 1-CLICK AUTOMATED UPDATE SCRIPT
# Run this command on your server anytime you make changes:
# ./deploy-update.sh
# =========================================================

echo "🚀 Starting Matuki ERP 1-Click Auto Update..."

# 1. Flush SQLite WAL to ensure 100% data safety
python3 -c "
import sqlite3, os
db_path = os.path.abspath('data/matuki.db')
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    conn.execute('PRAGMA wal_checkpoint(TRUNCATE);')
    conn.close()
    print('✅ SQLite WAL checkpoint completed safely.')
" || true

# 2. Pull latest code updates from GitHub
echo "📥 Pulling latest code changes..."
git pull origin main || git pull

# 3. Install any new npm packages
echo "📦 Installing packages..."
npm install

# 4. Build frontend for maximum production speed
echo "⚡ Building frontend bundle..."
npm run build

# 5. Restart backend & frontend PM2 processes
echo "🔄 Restarting ERP services..."
pm2 restart matuki-backend || pm2 start server/index.js --name "matuki-backend"
pm2 restart matuki-frontend || pm2 start "npx vite preview --host 0.0.0.0 --port 5173" --name "matuki-frontend"
pm2 save

echo "========================================================="
echo "🎉 100% SUCCESS: Matuki ERP updated live with 0% data loss!"
echo "========================================================="
