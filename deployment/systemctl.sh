#!/bin/bash

# Enable the service on boot
systemctl enable parkingfee-monitor.service

# Start the service
systemctl start parkingfee-monitor.service
systemctl restart parkingfee-monitor.service
systemctl status parkingfee-monitor.service

# Verify it is running
journalctl -u parkingfee-monitor.service

# Reload all services if you make changes to the service
systemctl daemon-reload
systemctl restart parkingfee-monitor.service

# List process
ps -ef | grep server.js

# Permissions
chmod +x /etc/systemd/system/parkingfee-monitor.service
chmod 664 /etc/systemd/system/parkingfee-monitor.service

# To kill process
# shellcheck disable=SC1083
kill -9 {numberPID}

# Open chromium browser
chromium-browser \
  --new-window \
  --window-position=1366,0 \
  --start-fullscreen \
  "http://localhost:3000"