#!/data/data/com.termux/files/usr/bin/sh
# Keeps the hub alive: restarts it 3 s after any crash. Small heap for a 1 GB tablet.
cd "$(dirname "$0")/.."
while true; do
  echo "--- $(date) starting hub"
  node --max-old-space-size=160 src/server.mjs
  echo "--- $(date) hub exited ($?), restarting in 3 s"
  sleep 3
done
