#!/bin/bash
# Pinggy reverse tunnel for the LK21 catalog API (port 3110).
# The public URL is printed by the remote shell and extracted into
# /home/hatch/apps/lk21-api/tunnel-url.txt for easy lookup.
set -a
[ -f /home/hatch/workspace/9router-pro/.env ] && . /home/hatch/workspace/9router-pro/.env
set +a
LOG=/home/hatch/apps/lk21-api/tunnel.log
: > "$LOG"
while true; do
  rm -f /home/hatch/apps/lk21-api/tunnel-url.txt
  ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
    -o ServerAliveInterval=30 -o ServerAliveCountMax=3 -o ExitOnForwardFailure=yes \
    -o ProxyCommand="/home/hatch/workspace/9router-pro/proxycommand.sh %h %p" \
    -p 443 -R0:localhost:3110 a.pinggy.io 2>&1 | tee -a "$LOG" \
    | grep --line-buffered -ao 'https://[a-z0-9.-]*\.free\.pinggy\.net' | head -1 \
    | tee /home/hatch/apps/lk21-api/tunnel-url.txt
  sleep 5
done
