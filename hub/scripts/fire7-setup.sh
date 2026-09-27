#!/data/data/com.termux/files/usr/bin/bash
# Jeevo on Harsh's Fire 7: 2017 "austin", LineageOS 14.1 (Android 7.1.2), 1 GB RAM, 32-bit ARM, rooted.
# Run inside Termux (from F-Droid):  bash ~/growbot/hub/scripts/fire7-setup.sh
# Safe to run again; it never overwrites your config, profile or secrets.
set -e
say() { printf '\n\033[1m▸ %s\033[0m\n' "$1"; }

say "1/6 Packages (Node LTS, git, Termux:API tools, Tailscale)"
pkg update -y && pkg upgrade -y
pkg install -y nodejs-lts git termux-api
pkg install -y tailscale || echo "  (tailscale package not available: see docs/14-build-guide.md, part C, plan B)"

say "2/6 Code"
if [ -d ~/growbot/.git ]; then git -C ~/growbot pull --ff-only || true
else git clone -b claude/relaxed-volta-mek7ih https://github.com/harshv-web/growbot ~/growbot; fi
cd ~/growbot/hub
npm install --no-audit --no-fund --omit=optional
for f in config profile secrets; do [ -f $f.json ] || cp $f.example.json $f.json; done

say "3/6 Self-test (17 checks)"
npm test || echo "  Some checks failed: run 'bash scripts/doctor.sh' and send me the output."

say "4/6 Start at boot (Termux:Boot)"
mkdir -p ~/.termux/boot
cat > ~/.termux/boot/jeevo.sh <<'BOOT'
#!/data/data/com.termux/files/usr/bin/sh
termux-wake-lock
# screen stays on while charging; Termux is never put to sleep by Doze
su -c 'settings put global stay_on_while_plugged_in 3' 2>/dev/null
su -c 'dumpsys deviceidle whitelist +com.termux' 2>/dev/null
su -c 'dumpsys deviceidle whitelist +com.termux.api' 2>/dev/null
# Tailscale without the app (the app needs Android 8+): userspace mode, no VPN permission needed
if command -v tailscaled >/dev/null; then
  mkdir -p ~/.tailscale
  tailscaled --tun=userspace-networking --statedir="$HOME/.tailscale" --socket="$PREFIX/var/run/tailscaled.sock" >> ~/tailscaled.log 2>&1 &
fi
sh ~/growbot/hub/scripts/run.sh >> ~/jeevo.log 2>&1 &
sleep 20
am start -a android.intent.action.VIEW -d "http://localhost:8047/app/#jeevo" -p com.android.chrome >/dev/null 2>&1
BOOT
chmod +x ~/.termux/boot/jeevo.sh

say "5/6 A 'jeevo' command"
mkdir -p ~/bin
cat > ~/bin/jeevo <<'CMD'
#!/data/data/com.termux/files/usr/bin/sh
case "$1" in
  start)  pgrep -f "src/server.mjs" >/dev/null && echo "already running" || (sh ~/growbot/hub/scripts/run.sh >> ~/jeevo.log 2>&1 &) ;;
  stop)   pkill -f "scripts/run.sh"; pkill -f "src/server.mjs"; echo stopped ;;
  log)    tail -n 60 -f ~/jeevo.log ;;
  update) git -C ~/growbot pull --ff-only && (cd ~/growbot/hub && npm install --no-audit --no-fund --omit=optional) && jeevo stop && jeevo start ;;
  doctor) bash ~/growbot/hub/scripts/doctor.sh ;;
  edit)   ${EDITOR:-nano} ~/growbot/hub/${2:-profile}.json ;;
  *)      echo "jeevo start | stop | log | update | doctor | edit [profile|config|secrets]" ;;
esac
CMD
chmod +x ~/bin/jeevo
grep -q 'HOME/bin' ~/.bashrc 2>/dev/null || echo 'export PATH="$HOME/bin:$PATH"' >> ~/.bashrc

say "6/6 Done"
echo "Next:"
echo "  1. Open Termux:Boot once (so Android lets it run at boot)."
echo "  2. Settings → Apps → Termux:API → Permissions: Camera, Microphone. And Settings → Sound & notification → Notification access → Termux:API."
echo "  3. jeevo edit profile    (fill in the fill_me_in answers)"
echo "  4. jeevo edit secrets    (GEMINI_API_KEY lets it hear you; ANTHROPIC_API_KEY lets it see and think)"
echo "  5. jeevo start, then open http://localhost:8047/app/ in Chrome and add it to the home screen."
echo "  6. After a reboot, once: tailscale --socket=\$PREFIX/var/run/tailscaled.sock up"
echo "     then:                  tailscale --socket=\$PREFIX/var/run/tailscaled.sock serve --bg 8047   (https for the iPhone app + push)"
