#!/bin/bash

# Config serial port with RAW setting:
stty -F /dev/ttyUSB0 speed 9600 cs8 -cstopb -parenb raw

# Check for Chromium Browser
if ! command -v chromium-browser &> /dev/null; then
    echo "Chromium Browser could not be found, installing it..."
    sudo apt update
    sudo apt install -y chromium-browser
else
    echo "Chromium Browser is already installed."
fi

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "Node.js could not be found, installing it..."
    curl -sL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
else
    echo "Node.js is already installed."
fi

# Define the node_modules directory path
NODE_MODULES_DIR="./node_modules"

# Check if the node_modules directory exists
if [ -d "$NODE_MODULES_DIR" ]; then
    echo "The node_modules directory exists and will be removed."
    # Remove the node_modules directory
    rm -rf "$NODE_MODULES_DIR"
    echo "node_modules has been removed."
fi

# Download and install packages
npm install

# Create user's systemd directory:
mkdir -p ~/.config/systemd/user

# Create systemd service file
echo "[Unit]
Description=Parking Fee Monitor Server and Chromium Browser
After=network.target

[Service]
ExecStart=/usr/bin/node /opt/blueparking-pos/parkingfee-screen/server.js
ExecStartPost=/opt/blueparking-pos/parkingfee-screen/chromium-browser.sh
Restart=on-failure
RestartSec=10
LimitNOFILE=1024
MemoryMax=500M
CPUQuota=50%
WorkingDirectory=/opt/blueparking-pos/parkingfee-screen
StandardOutput=journal
StandardError=inherit
Environment=NODE_PORT=13030
Environment=DISPLAY=:0
Environment=XAUTHORITY=/home/blueparking/.Xauthority

[Install]
WantedBy=default.target" | sudo tee ~/.config/systemd/user/parkingfee-monitor.service

# Making Files Executable
sudo chmod +x /opt/blueparking-pos/parkingfee-screen/chromium-browser.sh

# To allows the user's services to start at boot time, even if the user is not logged in.
sudo loginctl enable-linger blueparking

# Reload systemd to apply new service
sudo --user systemctl daemon-reload

# Enable the User Service:
sudo systemctl --user enable parkingfee-monitor.service

# Start the User Service
sudo systemctl --user start parkingfee-monitor.service
