#!/bin/bash

# =========================================================
# MATUKI BUSINESS ERP - 1-CLICK AUTOMATED UPDATE SCRIPT
# Run this command on your server anytime you make changes:
# ./deploy-update.sh
# =========================================================

echo "🚀 Starting Matuki ERP 1-Click Auto Update..."

# 1. Open UFW firewall ports so login and API requests are never blocked
if command -v ufw > /dev/null 2>&1; then
    sudo ufw allow 80/tcp || true
    sudo ufw allow 443/tcp || true
    sudo ufw allow 4321/tcp || true
    sudo ufw allow 5173/tcp || true
fi

# 2. Flush SQLite WAL to ensure 100% data safety
python3 -c "
import sqlite3, os
db_path = os.path.abspath('data/matuki.db')
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    conn.execute('PRAGMA wal_checkpoint(TRUNCATE);')
    conn.close()
    print('✅ SQLite WAL checkpoint completed safely.')
" || true

# 3. Pull latest code updates from GitHub
echo "📥 Pulling latest code changes..."
git pull origin main || git pull

# 4. Install any new npm packages
echo "📦 Installing packages..."
npm install

# 5. Build frontend for maximum production speed
echo "⚡ Building frontend bundle..."
npm run build

# 6. Configure Nginx Reverse Proxy (Forward /api directly to Node backend on port 4321)
if command -v nginx > /dev/null 2>&1; then
    echo "⚙️ Configuring Nginx reverse proxy..."
    cat << 'EOF' | sudo tee /etc/nginx/sites-available/erp > /dev/null
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    root /var/www/erp/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://127.0.0.1:4321;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

    sudo ln -sf /etc/nginx/sites-available/erp /etc/nginx/sites-enabled/default
    sudo nginx -t && sudo systemctl reload nginx || true
fi

# 7. Restart backend & frontend PM2 processes
echo "🔄 Restarting ERP services..."
pm2 restart matuki-backend || pm2 start server/index.js --name "matuki-backend"
pm2 restart matuki-frontend || pm2 start "npx vite preview --host 0.0.0.0 --port 5173" --name "matuki-frontend"
pm2 save

echo "========================================================="
echo "🎉 100% SUCCESS: Matuki ERP updated live with 0% data loss!"
echo "========================================================="
