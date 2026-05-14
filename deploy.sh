#!/bin/bash

sudo apt update
sudo apt install python3 python3-pip python3-venv nodejs npm git -y

# If project already exists, don't clone again
if [ ! -d "TBP" ]; then
    git clone https://github.com/SaiGeetesh23/TBP.git
fi

cd TBP

# PYTHON BACKEND
cd Backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

pip install --upgrade pip
pip install -r ../requirements.txt

# Run backend
nohup python main.py > backend.log 2>&1 &

cd ../frontend

# Install frontend dependencies
npm install

# Build frontend
npm run build

# Install PM2
sudo npm install -g pm2

# Run frontend
pm2 delete frontend || true
pm2 start npm --name frontend -- start

pm2 save