#!/usr/bin/env bash
# Renders every keychain mood on your computer, no ESP32 needed: runs the real sketch's drawing code
# against a 128x64 framebuffer and writes sim/out/moods.html (open it in a browser).
# Needs g++ and curl. Downloads Adafruit GFX and ArduinoJson once into sim/.cache.
set -e
cd "$(dirname "$0")"
mkdir -p .cache out
G=https://raw.githubusercontent.com/adafruit/Adafruit-GFX-Library/master
for f in Adafruit_GFX.h Adafruit_GFX.cpp gfxfont.h glcdfont.c; do [ -f .cache/$f ] || curl -fsSL -o .cache/$f $G/$f; done
[ -f .cache/ArduinoJson-v7.h ] || curl -fsSL -o .cache/ArduinoJson-v7.h https://github.com/bblanchon/ArduinoJson/releases/download/v7.4.2/ArduinoJson-v7.4.2.h
sed 's/^#include <\(.*\)>/#include "\1"/' ../keychain-oled/keychain-oled.ino > out/sketch.inc
[ -f ../keychain-oled/secrets.h ] && cp ../keychain-oled/secrets.h out/ || cp ../keychain-oled/secrets.example.h out/secrets.h
g++ -std=gnu++17 -DARDUINO=100 -O1 -w -Istubs -I.cache -Iout main.cpp .cache/Adafruit_GFX.cpp -o out/sim
(cd out && ./sim)
{ echo '<body style="margin:0;background:#111;font:12px monospace;color:#aaa"><div id=g style="display:grid;grid-template-columns:repeat(auto-fill,268px);gap:6px;padding:6px"></div><script>const fs=';
  cat out/frames.json
  echo ';for(const f of fs){const d=document.createElement("div"),c=document.createElement("canvas");c.width=256;c.height=128;const x=c.getContext("2d");x.fillStyle="#000";x.fillRect(0,0,256,128);x.fillStyle="#5ab4ff";for(let i=0;i<8192;i++)if(f.b[i]==="1")x.fillRect(i%128*2,(i/128|0)*2,2,2);d.append(c," "+f.n);g.append(d)}</script></body>'; } > out/moods.html
echo "Open firmware/sim/out/moods.html"
