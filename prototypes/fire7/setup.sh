#!/data/data/com.termux/files/usr/bin/bash
# One-time setup of the Jeevo body on a rooted Fire 7 running LineageOS.
# Prereqs: Magisk root, Termux + Termux:API + Termux:Boot installed from F-Droid.
# Make a TWRP backup first — this is an unofficial ROM.
set -e
pkg update -y
pkg install -y nodejs-lts termux-api git
mkdir -p ~/.termux/boot
cat > ~/.termux/boot/jeevo.sh <<'EOF'
#!/data/data/com.termux/files/usr/bin/bash
termux-wake-lock
su -c 'dumpsys deviceidle disable'          # no Doze for the body
su -c 'settings put system screen_off_timeout 2147483647'
cd ~/growbot/prototypes/fire7 && node body-daemon.mjs >> ~/jeevo.log 2>&1
EOF
chmod +x ~/.termux/boot/jeevo.sh
echo "Optional: install the ACC Magisk module and run 'acc 80 40' to hold the battery at 40–80%."
echo "Then put SOUL_URL=… and TOKEN=… in ~/.jeevo.env and reboot."
