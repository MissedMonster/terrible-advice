#!/bin/bash
# One-click deploy Terrible Advice backend to Singapore server
# Usage: bash deploy.sh

SERVER="root@47.84.133.41"
KEY="$HOME/.ssh/id_ed25519_github"
DIR="e:/PPY/ClaudeCode/ClaudeDemo/terrible-advice/backend"

echo "Packing Terrible Advice backend..."
cd "$DIR"
tar -czf /tmp/terrible-advice-deploy.tar.gz \
  --exclude='node_modules' \
  --exclude='data/*' \
  --exclude='.env' \
  --exclude='package-lock.json' \
  server.js routes/ services/ package.json .env.example

echo "Uploading to Singapore..."
scp -i "$KEY" /tmp/terrible-advice-deploy.tar.gz "$SERVER:~/"

echo "Extracting and restarting..."
ssh -i "$KEY" "$SERVER" "
  mkdir -p ~/terrible-advice-backend/data
  cd ~/terrible-advice-backend
  tar -xzf ~/terrible-advice-deploy.tar.gz
  rm ~/terrible-advice-deploy.tar.gz
  npm install --silent
  pm2 restart terrible-advice || pm2 start server.js --name terrible-advice
  pm2 save
"

rm /tmp/terrible-advice-deploy.tar.gz
echo "Terrible Advice backend deployed!"
