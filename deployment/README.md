# Manage Systemd Services 

To install and run your `parkingfee-monitor.service` as a systemd service on a Linux system, follow these steps:

## Step 1: Create the Service File

1. Open a new file in `/etc/systemd/system/` directory with the name `parkingfee-monitor.service`. You can use a text editor like `nano`:
    ```shell
    sudo nano /etc/systemd/system/parkingfee-monitor.service
    ```
2. Copy and paste your service configuration into this file:
    ```shell
    [Unit]
    Description=Parking Fee Monitor Server
    After=network.target
    
    [Service]
    ExecStart=/usr/bin/node /opt/blueparking-pos/parkingfee-screen/server.js
    ExecStartPost=/bin/bash -c 'until nc -z localhost 3030; do sleep 1; done'
    Restart=on-failure
    RestartSec=10
    LimitNOFILE=1024
    MemoryMax=500M
    CPUQuota=50%
    WorkingDirectory=/opt/blueparking-pos/parkingfee-screen
    StandardOutput=journal
    StandardError=inherit
    Environment=NODE_PORT=3030
    
    [Install]
    WantedBy=multi-user.target
    ```
3. Save and exit the editor. In `nano`, you do this by pressing `Ctrl + X`, then `Y` to confirm, and `Enter` to save.

## Step 2: Reload Systemd

After creating the new service file, reload systemd to read the new service:

```shell
sudo systemctl daemon-reload
```

## Step 3: Enable and Start the Service

To enable the service, so it starts on boot, and then start the service immediately:

```shell
sudo systemctl enable parkingfee-monitor.service
sudo systemctl start parkingfee-monitor.service
```

## Step 4: Check the Service Status

To verify that the service is running correctly:

```shell
sudo systemctl status parkingfee-monitor.service
```

## Additional Notes:

- **File Paths**: Ensure that the paths in the service file (like `/opt/blueparking-pos/parkingfee-screen/server.js`) are correct and that the files exist.
- **Permissions**: Make sure that the `server.js` file is executable and that the user running the service has the necessary permissions.
- **Dependencies**: If your service depends on other services (like a database), you might need to add those to the `After=` line in the `[Unit]` section.
- **Networking Tool**: The `ExecStartPost` command uses `nc` (netcat) to check if the server is up. Ensure that `nc` is installed on your system.
- **Logs**: Use `journalctl` to check the logs for your service if needed:
    ```shell
    sudo journalctl -u parkingfee-monitor.service
    ```
- **Environment Variables**: Adjust the `Environment=NODE_PORT=3030` line if you have different environment variables.

This service will now start automatically on boot, and you can manage it using standard systemctl commands (`start`, `stop`, `restart`, `status`).