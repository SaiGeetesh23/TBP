#!/bin/bash

sudo apt update
sudo apt install python3 python3-pip nodejs npm git -y

# Clone project
git clone https://github.com/SaiGeetesh23/TBP.git
cd TBP

# BACKEND (Python)
cd Backend
pip3 install -r ../requirements.txt

# Run backend
nohup python3 main.py > backend.log 2>&1 &

# FRONTEND (Next.js)
cd ../frontend
npm install
npm run build

# Run frontend
sudo npm install -g pm2
pm2 start npm --name frontend -- start

pm2 save