#!/bin/bash

# =========================================================
# MATUKI BUSINESS ERP - INITIAL CLOUD SERVER SETUP SCRIPT
# Run this once on a fresh Ubuntu VPS server:
# bash setup-server.sh
# =========================================================

echo "🚀 Installing Matuki ERP Cloud Environment..."

# Update Ubuntu & install Node.js 20, PM2, Git, Nginx
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git nginx certbot python3-certbot-nginx python3
sudo npm install -g pm2

# Enable PM2 startup on boot
pm2 startup systemd -u root --hp /root || true

echo "✅ Cloud server environment ready! Next step: clone repository from https://github.com/darkwebp1991/matuki-business-erp.git"
