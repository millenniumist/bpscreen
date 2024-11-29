#!/bin/bash

# Check if the server is up
check_server() {
    curl --silent --fail http://localhost:13030
    return $?
}

# Wait for the server to be ready
until check_server; do
    echo "Waiting for server..."
    sleep 2
done

echo "Server is up!"

# Open Chromium on the second monitor
chromium-browser \
    --new-window \
    --window-position=1366,0 \
    --start-fullscreen \
    "http://localhost:13030" &