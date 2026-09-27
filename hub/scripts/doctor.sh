#!/data/data/com.termux/files/usr/bin/bash
# Checks everything Jeevo needs on the Fire 7 and says what to fix. Paste the output to Claude if stuck.
ok() { printf '  \033[32m✓\033[0m %s\n' "$1"; }
no() { printf '  \033[31m✗\033[0m %s\n     → %s\n' "$1" "$2"; }
has() { command -v "$1" >/dev/null 2>&1; }
cd "$(dirname "$0")/.."
echo "Jeevo doctor · $(date)"
echo "Tablet: $(getprop ro.product.model 2>/dev/null) · Android $(getprop ro.build.version.release 2>/dev/null) · $(getprop ro.lineage.version 2>/dev/null) · $(uname -m)"
has node && ok "node $(node -v)" || no "node missing" "pkg install nodejs-lts"
node -e 'process.exit(+process.versions.node.split(".")[0] >= 20 ? 0 : 1)' 2>/dev/null && ok "node ≥ 20" || no "node too old" "pkg upgrade nodejs-lts"
[ -d node_modules/ws ] && ok "npm packages installed" || no "npm packages missing" "cd ~/growbot/hub && npm install"
for f in config profile secrets; do [ -f $f.json ] && ok "$f.json" || no "$f.json missing" "cp $f.example.json $f.json"; done
has termux-battery-status && ok "Termux:API tools" || no "Termux:API tools missing" "pkg install termux-api, and install the Termux:API app from F-Droid"
if has termux-battery-status; then
  b=$(timeout 10 termux-battery-status 2>/dev/null)
  [ -n "$b" ] && ok "battery: $(echo "$b" | tr -d '\n ' | sed 's/.*"percentage":\([0-9]*\).*"plugged":"\([A-Z_]*\)".*"temperature":\([0-9.]*\).*/\1% \2 \3°C/')" || no "Termux:API app not answering" "install Termux:API from F-Droid (same source as Termux)"
  c=$(timeout 10 termux-camera-info 2>/dev/null | grep -c '"id"')
  [ "${c:-0}" -gt 0 ] && ok "cameras: $c" || no "no camera through Termux:API" "Settings → Apps → Termux:API → Permissions → Camera (the face's own camera still works in Chrome)"
  n=$(timeout 10 termux-notification-list 2>&1 | head -c 200)
  echo "$n" | grep -q '\[' && ok "notification access" || no "no notification access" "Settings → Sound & notification → Notification access → Termux:API"
fi
su -c id >/dev/null 2>&1 && ok "root" || no "no root for Termux" "Developer options → Root access → Apps and ADB (then allow Termux)"
[ -x ~/.termux/boot/jeevo.sh ] && ok "starts at boot" || no "no boot script" "bash scripts/fire7-setup.sh, then open Termux:Boot once"
if curl -s -m 3 localhost:8047/api/state >/dev/null; then ok "hub running on :8047"; else no "hub not running" "jeevo start   (log: jeevo log)"; fi
curl -s -m 3 localhost:8047/api/state | grep -q '"tablet":{"pct"' && ok "hub reads the tablet battery" || true
if has tailscale; then
  ip=$(tailscale --socket="$PREFIX/var/run/tailscaled.sock" ip -4 2>/dev/null | head -1)
  [ -n "$ip" ] && ok "tailscale: http://$ip:8047" || no "tailscale not up" "tailscale --socket=\$PREFIX/var/run/tailscaled.sock up"
else no "tailscale not installed" "pkg install tailscale (or plan B in the guide)"; fi
wifi=$(ip -4 addr show wlan0 2>/dev/null | grep -o 'inet [0-9.]*' | cut -d' ' -f2)
[ -n "$wifi" ] && ok "Wi-Fi IP $wifi  (put this in the keychain's secrets.h as HUB_HOST)" || no "no Wi-Fi IP" "join Wi-Fi"
free -m 2>/dev/null | awk '/Mem:/ {printf "  · RAM: %s MB free of %s MB\n", $7, $2}'
df -h "$HOME" 2>/dev/null | awk 'NR==2 {printf "  · storage: %s free\n", $4}'
node -e 'const s=require("./secrets.json");console.log("  · keys: "+["GEMINI_API_KEY","ANTHROPIC_API_KEY","HUB_TOKEN"].map(k=>k+(s[k]?" ✓":" –")).join("  "))' 2>/dev/null
