#!/bin/bash

sudo apt update
sudo apt install nodejs npm git nginx -y

git clone https://github.com/SaiGeetesh23/TBP.git
cd TBP

# Backend
cd backend
npm install
sudo npm install -g pm2
pm2 start server.js --name floatchat-backend

# Frontend
cd ../frontend
npm install
npm run build
sudo cp -r build/* /var/www/html/

sudo systemctl restart nginx