// Jeevo Key v1: Seeed XIAO ESP32-S3 + 1.3" I2C OLED (SH1106, 128x64) + a wire as a touch pad.
// The same ~38 moods as the tablet face, redrawn in 1-bit: springy eyes with eyelids, blinks, hops,
// glances, blush, hearts, zzz, tears, sweat, notes and sparkles. The keychain also has feelings of its own:
//   touch = tickled, hold = cosy, three quick taps = dizzy, B (BOOT) short = "on my way", B long = "come here".
// No display plugged in? It still runs: the board's LED breathes with the mood instead.
// Pages (press B): face → next up → scooter → day → clock. B twice = "on my way". Hold B = "come here" (soul moves in).
// Alerts (reminders, "plug in tonight") take over the screen; touch to mark done. Dims when idle; updates over Wi-Fi (OTA).
//
// Libraries (Arduino Library Manager): Adafruit GFX, Adafruit SH110X (1.3" SH1106) or Adafruit SSD1306 (0.96"),
//   WebSockets (Markus Sattler), ArduinoJson 7, NimBLE-Arduino.
// Board: "XIAO_ESP32S3" (esp32 by Espressif, 3.x), USB CDC On Boot: Enabled. Screw the antenna on: Wi-Fi needs it.
// Wiring for the XIAO (read the labels on YOUR OLED; pin order differs between sellers):
//   OLED VCC/VDD → 3V3, GND → GND, SDA → D4, SCL/SCK → D5.   Touch: ~10 cm wire or foil on D3.
#include <WiFi.h>
#include <WiFiMulti.h>
#include <ArduinoOTA.h>
#include <time.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include <NimBLEDevice.h>
#include "secrets.h"   // WIFI_SSID, WIFI_PASS, HUB_HOST, HUB_PORT, HUB_TOKEN  (see secrets.example.h)

// ---- your hardware ----
#define BOARD_XIAO_S3 1        // 1 = Seeed XIAO ESP32-S3 (yours). 0 = ESP32-S3 Super Mini / DevKitC-1.
#define OLED_SH1106 1          // 1 = 1.3" SH1106 (yours). 0 = 0.96" SSD1306.
#define OLED_H 64              // 64, or 32 for the thin 0.91" strip
#if BOARD_XIAO_S3
#define SDA_PIN 5              // D4
#define SCL_PIN 6              // D5
#define TOUCH_PIN 4            // D3
#define LED_PIN 21             // yellow user LED, on when LOW
#define LED_RGB 0
#else
#define SDA_PIN 8
#define SCL_PIN 9
#define TOUCH_PIN 4
#define LED_PIN 48             // RGB LED (DevKitC-1 v1.1 boards use 38)
#define LED_RGB 1
#endif
#define BOOT_PIN 0

#if OLED_SH1106
#include <Adafruit_SH110X.h>
Adafruit_SH1106G oled(128, OLED_H, &Wire, -1);
#define OLED_BEGIN(a) oled.begin(a, true)
#define OLED_DIM(d) oled.setContrast((d) ? 8 : 200)
#else
#include <Adafruit_SSD1306.h>
Adafruit_SSD1306 oled(128, OLED_H, &Wire, -1);
#define OLED_BEGIN(a) oled.begin(SSD1306_SWITCHCAPVCC, a)
#define OLED_DIM(d) oled.dim(d)
#endif
#define W 1
#define B 0

WebSocketsClient ws;
WiFiMulti wifi;
bool hasOled = false, online = false, otaOn = false;
// what the hub tells the key about your day (see keyInfo() in hub/src/server.mjs)
struct Info { String next = ""; int soc = -1, range = -1, needs = 0, tasks = 0; bool charging = false; String weather = ""; } info;
String alertText = "", alertTask = "", noteText = ""; uint32_t alertUntil = 0, noteUntil = 0, lastInteract = 0;
int page = 0; const int PAGES = 5; bool dimmed = false;

// ---- moods: the same presets as hub/face/face.js, trimmed to what 1 bit can show ----
enum Ov : uint8_t { O_NONE, O_HEART, O_SPIRAL, O_SQUEEZE, O_STAR, O_CLOSED };
enum Fx : uint8_t { F_NONE, F_ZZZ, F_NOTES, F_SPARK, F_HEARTS, F_SWEAT, F_TEARS, F_Q, F_VEIN, F_DOTS, F_BANG, F_STEAM };
struct Face { const char *name; float open, lidTH, lidT, lidB, gx, gy, mc, mo, bounce; uint8_t ov, fx; bool cat, wob, blush, wink; };
const Face FACES[] = {
  // name        open  lidTH lidT  lidB  gx    gy    mc    mo   bounce ov         fx        cat    wob    blush  wink
  {"content",    1.0,  0,    0,    0,    0,    0,    .35,  0,   .15, O_NONE,    F_NONE,   false, false, false, false},
  {"joyful",     1.0,  0,    0,    .42,  0,    0,    .8,   .15, .5,  O_NONE,    F_NOTES,  false, false, true,  false},
  {"excited",    1.1,  0,    0,    0,    0,    0,    .9,   .55, .9,  O_NONE,    F_SPARK,  false, false, true,  false},
  {"proud",      1.0,  .16,  0,    .35,  0,   -.25,  .7,   0,   .2,  O_NONE,    F_SPARK,  false, false, false, false},
  {"curious",    1.05, 0,    0,    0,    .35, -.1,   .1,   .12, .15, O_NONE,    F_Q,      false, false, false, false},
  {"sleepy",     .38,  .42,  0,    0,    0,    .25,  .1,   0,   .05, O_NONE,    F_ZZZ,    false, false, false, false},
  {"lonely",     .85,  .28, -.55,  0,    0,    .35, -.35,  0,   .04, O_NONE,    F_NONE,   false, false, false, false},
  {"uneasy",     .9,   .2,  -.35,  0,    0,    0,   -.2,   0,   .1,  O_NONE,    F_SWEAT,  false, true,  false, false},
  {"grumpy",     1.0,  .38,  .7,   0,    0,    0,   -.45,  0,   .04, O_NONE,    F_VEIN,   false, false, false, false},
  {"dizzy",      1.0,  0,    0,    0,    0,    0,   -.1,   0,   .1,  O_SPIRAL,  F_SPARK,  false, true,  false, false},
  {"tickled",    1.0,  0,    0,    0,    0,    0,    1,    .6,  1,   O_SQUEEZE, F_NONE,   false, false, true,  false},
  {"cosy",       .45,  .25,  0,    .45,  0,    0,    .5,   0,   .08, O_NONE,    F_NONE,   true,  false, true,  false},
  {"hungry",     .9,   .15, -.3,   0,    0,    .3,  -.05,  .28, .1,  O_NONE,    F_NONE,   false, false, false, false},
  {"worried",    1.0,  .18, -.5,   0,    0,    0,   -.25,  0,   .1,  O_NONE,    F_SWEAT,  false, true,  false, false},
  {"focused",    .55,  .3,   .25,  0,    0,    0,    0,    0,   0,   O_NONE,    F_NONE,   false, false, false, false},
  {"hot",        .6,   .3,   0,    0,    0,    0,   -.2,   .35, .1,  O_NONE,    F_STEAM,  false, false, false, false},
  {"love",       1.0,  0,    0,    0,    0,    0,    .9,   .2,  .6,  O_HEART,   F_HEARTS, false, false, true,  false},
  {"listening",  1.1,  0,    0,    0,   -.2,   0,    .2,   0,   .1,  O_NONE,    F_NONE,   false, false, false, false},
  {"thinking",   1.0,  .12,  0,    0,    .5,  -.55,  0,    0,   .1,  O_NONE,    F_DOTS,   false, false, false, false},
  {"talking",    1.0,  0,    0,    .15,  0,    0,    .5,   0,   .2,  O_NONE,    F_NONE,   false, false, false, false},
  {"surprised",  1.25, 0,    0,    0,    0,    0,    0,    .75, .1,  O_NONE,    F_BANG,   false, false, false, false},
  {"looking",    1.1,  0,    0,    0,    0,    0,    .1,   0,   .1,  O_NONE,    F_NONE,   false, false, false, false},
  {"dozing",     .04,  0,    0,    0,    0,    0,    .1,   0,   .04, O_CLOSED,  F_ZZZ,    false, false, false, false},
  {"shy",        .8,   0,    0,    .4,  -.4,   .3,   .45,  0,   .1,  O_NONE,    F_NONE,   false, false, true,  false},
  {"laughing",   1.0,  0,    0,    0,    0,    0,    1,    .85, 1,   O_SQUEEZE, F_NOTES,  false, false, true,  false},
  {"confused",   1.0,  .15, -.2,   0,    0,    0,   -.05,  0,   .1,  O_NONE,    F_Q,      false, true,  false, false},
  {"scared",     1.2,  .1,  -.3,   0,    0,    0,   -.3,   .2,  .1,  O_NONE,    F_SWEAT,  false, true,  false, false},
  {"crying",     .7,   .3,  -.6,   0,    0,    0,   -.6,   .3,  .1,  O_NONE,    F_TEARS,  false, true,  false, false},
  {"sad",        1.0,  .28, -.6,   0,    0,    .25, -.5,   0,   .03, O_NONE,    F_NONE,   false, false, false, false},
  {"bored",      .5,   .4,   0,    0,    .45,  0,   -.05,  0,   .02, O_NONE,    F_NONE,   false, false, false, false},
  {"smug",       1.0,  .35,  .12,  .25,  .3,   0,    .55,  0,   .1,  O_NONE,    F_NONE,   true,  false, false, false},
  {"wink",       1.0,  0,    0,    .3,   0,    0,    .8,   .2,  .3,  O_NONE,    F_SPARK,  false, false, true,  true},
  {"amazed",     1.2,  0,    0,    0,    0,    0,    .4,   .45, .6,  O_STAR,    F_SPARK,  false, false, false, false},
  {"determined", .85,  .3,   .45,  0,    0,    0,    .2,   0,   .1,  O_NONE,    F_NONE,   false, false, false, false},
  {"relieved",   .6,   0,    0,    .5,   0,    0,    .5,   0,   .1,  O_NONE,    F_NONE,   false, false, false, false},
  {"sulky",      1.0,  .3,   .35,  0,   -.45,  .15, -.3,   0,   .05, O_NONE,    F_NONE,   false, false, true,  false},
  {"angry",      1.0,  .45,  .9,   0,    0,    0,   -.6,   .3,  .1,  O_NONE,    F_STEAM,  false, false, false, false},
  {"grateful",   1.0,  0,    0,    .5,   0,    0,    .7,   0,   .15, O_NONE,    F_HEARTS, false, false, true,  false},
};
const int NFACES = sizeof(FACES) / sizeof(FACES[0]);
const Face *findFace(const String &n) { for (int i = 0; i < NFACES; i++) if (n == FACES[i].name) return &FACES[i]; return &FACES[0]; }

// ---- springs: every number glides to its target with a tiny overshoot ----
struct Spring { float x = 0, v = 0, t = 0; void step(float dt, float k = 120, float c = 14) { v += (k * (t - x) - c * v) * dt; x += v * dt; } };
Spring sOpen, sLidTH, sLidT, sLidB, sGx, sGy, sMc, sMo, sBounce, sSy, sBlink;
const Face *cur = &FACES[0];
String hubLabel = "content"; int hubHue = 150; bool hubTalk = false;
String localSense = ""; uint32_t senseUntil = 0;

void target(const Face *f) {
  if (f != cur) { sSy.v += 4; }                 // boing on every change of mood
  cur = f;
  sOpen.t = f->open; sLidTH.t = f->lidTH; sLidT.t = f->lidT; sLidB.t = f->lidB;
  sGx.t = f->gx; sGy.t = f->gy; sMc.t = f->mc; sMo.t = f->mo; sBounce.t = f->bounce;
}

// ---- tiny particles ----
struct Part { float x, y, vx, vy, life; uint8_t k; } parts[10]; int nParts = 0;
void emit(uint8_t k, float x, float y, float vx, float vy, float life) { if (nParts < 10) parts[nParts++] = {x, y, vx, vy, life, k}; }

// ---- drawing ----
void heart(int x, int y, int s) { oled.fillCircle(x - s / 2, y - s / 3, s / 2 + 1, W); oled.fillCircle(x + s / 2, y - s / 3, s / 2 + 1, W); oled.fillTriangle(x - s - 1, y - s / 5, x + s + 1, y - s / 5, x, y + s, W); }
void star(int x, int y, int r) { for (int i = 0; i < 5; i++) { float a = -PI / 2 + i * 2 * PI / 5; oled.fillTriangle(x, y, x + cos(a) * r, y + sin(a) * r, x + cos(a + PI / 5) * r * .45, y + sin(a + PI / 5) * r * .45, W); oled.fillTriangle(x, y, x + cos(a) * r, y + sin(a) * r, x + cos(a - PI / 5) * r * .45, y + sin(a - PI / 5) * r * .45, W); } }

void eye(int cx, int cy, int side, uint32_t t) {
  const int w = 24, h0 = OLED_H == 32 ? 16 : 30;
  float blink = constrain(sBlink.x, 0, 1);
  float wink = (cur->wink && side > 0) ? 1 : 0;
  int h = max(2, (int)(h0 * max(0.02f, sOpen.x) * (1 - blink * .95) * (1 - wink * .95)));
  switch (cur->ov) {
    case O_HEART: heart(cx, cy, 9 + (int)(sin(t / 160.0) * 1.5)); return;
    case O_STAR: star(cx, cy, 13); return;
    case O_SPIRAL: { float a0 = t / 150.0 * side; for (float a = 0; a < 14; a += 0.2) { float r = a * 0.95; oled.drawPixel(cx + cos(a * side + a0) * r, cy + sin(a * side + a0) * r, W); } return; }
    case O_SQUEEZE: { int d = 9 * side; for (int k = -1; k <= 1; k++) { oled.drawLine(cx + d, cy - 9 + k, cx - d, cy + k, W); oled.drawLine(cx - d, cy + k, cx + d, cy + 9 + k, W); } return; }
  }
  if (h <= 3 || cur->ov == O_CLOSED) {       // closed: a soft arc, smiling if the mouth smiles
    int up = (sMc.x > .2 || wink) ? -1 : 1;
    for (int x = -10; x <= 10; x++) { int y = cy + up * (int)(4 * (1 - x * x / 100.0)); oled.drawPixel(cx + x, y, W); oled.drawPixel(cx + x, y + 1, W); }
    return;
  }
  oled.fillRoundRect(cx - w / 2, cy - h / 2, w, h, min(w, h) / 3, W);
  // top lid, slanted: + = angry (inner edge low), - = sad (outer edge low)
  int top = cy - h / 2, lt = sLidTH.x * h, sl = sLidT.x * h * .36, inner = -side;
  int xIn = cx + inner * (w / 2 + 1), xOut = cx - inner * (w / 2 + 1);
  int yIn = top + lt + sl, yOut = top + lt - sl;
  oled.fillTriangle(xIn, top - 1, xOut, top - 1, xIn, yIn, B); oled.fillTriangle(xOut, top - 1, xOut, yOut, xIn, yIn, B);
  // cheek lid from below: makes happy ^ ^ eyes
  if (sLidB.x > .02) { int R = w; oled.fillCircle(cx, cy + h / 2 + R - (int)(sLidB.x * h), R, B); }
  // eye shine
  if (h > 10) { oled.fillCircle(cx - 5 + (int)(sGx.x * 2), cy - h / 4, 2, B); }
}

void mouth(int cx, int my, uint32_t t) {
  float mc = sMc.x, mo = sMo.x;
  bool talk = hubTalk && millis() >= senseUntil;
  if (talk) mo = max(mo, (float)(sin(t / 75.0) * .5 + .5) * .6f);
  if (cur->cat) { oled.drawCircleHelper(cx - 3, my - 1, 3, 4 | 8, W); oled.drawCircleHelper(cx + 3, my - 1, 3, 4 | 8, W); return; }   // :3
  if (mo > .08) { int mw = 7, d = 2 + (int)(mo * 7); oled.fillRoundRect(cx - mw, my - d / 2 + (int)(mc * 2), mw * 2, d, d / 2, W); oled.fillRoundRect(cx - mw + 2, my - d / 2 + 2 + (int)(mc * 2), mw * 2 - 4, max(1, d - 4), 2, B); return; }
  for (int x = -9; x <= 9; x++) {
    float wob = cur->wob ? sin(x * .9 + t / 90.0) * 1.2 : 0;
    int y = my + (int)(mc * 5 * (1 - x * x / 81.0) - mc * 2) + (int)wob;   // mc > 0 smiles
    oled.drawPixel(cx + x, y, W); oled.drawPixel(cx + x, y + 1, W);
  }
}

void effects(int cx, int cy, uint32_t t, float dt) {
  uint8_t fx = cur->fx;
  if (fx == F_ZZZ && random(100) < 2) emit(F_ZZZ, cx + 28, cy - 12, 10, -12, 2.5);
  if (fx == F_NOTES && random(100) < 3) emit(F_NOTES, random(2) ? 6 : 116, 34, 0, -14, 2);
  if (fx == F_SPARK && random(100) < 6) emit(F_SPARK, random(4, 124), random(4, 60), 0, -3, .8);
  if (fx == F_HEARTS && random(100) < 4) emit(F_HEARTS, random(10, 118), 50, 0, -18, 2);
  if (fx == F_SWEAT && random(100) < 2) emit(F_SWEAT, cx + 36, cy - 14, 0, 8, 1.8);
  if (fx == F_TEARS && random(100) < 10) emit(F_TEARS, random(2) ? 34 : 94, cy + 12, 0, 20, 1.2);
  if (fx == F_STEAM && random(100) < 5) emit(F_STEAM, random(2) ? 8 : 120, 10, 0, -10, 1);
  for (int i = 0; i < nParts; i++) {
    Part &p = parts[i]; p.life -= dt; if (p.k == F_TEARS) p.vy += 60 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.life <= 0) { parts[i] = parts[--nParts]; i--; continue; }
    int x = p.x, y = p.y;
    switch (p.k) {
      case F_ZZZ: oled.drawLine(x, y, x + 4, y, W); oled.drawLine(x + 4, y, x, y + 4, W); oled.drawLine(x, y + 4, x + 4, y + 4, W); break;
      case F_NOTES: oled.fillCircle(x, y + 5, 2, W); oled.drawLine(x + 2, y + 5, x + 2, y - 1, W); oled.drawLine(x + 2, y - 1, x + 5, y + 1, W); break;
      case F_SPARK: oled.drawLine(x - 2, y, x + 2, y, W); oled.drawLine(x, y - 2, x, y + 2, W); break;
      case F_HEARTS: heart(x, y, 3); break;
      case F_SWEAT: case F_TEARS: oled.fillCircle(x, y + 1, 2, W); oled.drawPixel(x, y - 2, W); break;
      case F_STEAM: oled.drawCircle(x, y, 2 + (int)((1 - p.life) * 3), W); break;
    }
  }
  // badges that stay while the mood lasts
  if (fx == F_Q) { oled.setTextSize(1); oled.setTextColor(W); oled.setCursor(114, 4 + (int)(sin(t / 300.0) * 2)); oled.print("?"); }
  if (fx == F_BANG) { oled.fillRect(118, 3, 3, 9, W); oled.fillRect(118, 14, 3, 3, W); }
  if (fx == F_DOTS) for (int i = 0; i < 3; i++) oled.fillCircle(108 + i * 6, 8 - max(0, (int)(sin(t / 200.0 - i * .8) * 3)), 1, W);
  if (fx == F_VEIN) { int x = 116, y = 8, k = 4 + (int)(sin(t / 120.0) * 1); oled.drawLine(x - k, y - 1, x - 1, y - 1, W); oled.drawLine(x - 1, y - k, x - 1, y - 1, W); oled.drawLine(x + 1, y + 1, x + k, y + 1, W); oled.drawLine(x + 1, y + 1, x + 1, y + k, W); }
}

uint32_t nextBlink = 0, nextSacc = 0; float saccX = 0, saccY = 0;
// ---- text pages ----
void label(const char *s) { oled.setTextSize(1); oled.setTextColor(W); oled.setCursor(0, 0); oled.print(s); }
void dots() { for (int i = 0; i < PAGES; i++) { if (i == page) oled.fillCircle(52 + i * 6, 61, 2, W); else oled.drawPixel(52 + i * 6, 61, W); } }
void big(int y, const String &s, int size = 3) { oled.setTextSize(size); oled.setTextColor(W); int w = s.length() * 6 * size; oled.setCursor(max(0, (128 - w) / 2), y); oled.print(s.c_str()); }
void small(int y, const String &s) { oled.setTextSize(1); oled.setTextColor(W); int w = s.length() * 6; oled.setCursor(max(0, (128 - w) / 2), y); oled.print(s.c_str()); }
void drawPage() {
  oled.clearDisplay();
  if (page == 1) { label("NEXT"); if (info.next.length()) { big(14, info.next.substring(0, 5), 3); small(44, info.next.substring(6, 27)); } else big(22, "free", 2); }
  if (page == 2) { label("SCOOTER"); if (info.soc >= 0) { big(12, String(info.soc) + "%", 3); small(42, (info.range >= 0 ? String(info.range) + " km" : String("")) + (info.charging ? "  charging" : "")); } else small(28, "not connected"); }
  if (page == 3) { label("TODAY"); big(14, String(info.tasks), 2); small(32, "tasks open"); small(44, String(info.needs) + " need you  " + info.weather); }
  if (page == 4) { struct tm tm; if (getLocalTime(&tm, 5)) { char b[8], d[16]; strftime(b, 8, "%H:%M", &tm); strftime(d, 16, "%a %d %b", &tm); big(14, b, 3); small(44, d); } else small(28, "no time yet"); }
  dots(); if (!online) oled.fillRect(124, 60, 3, 3, W);
  oled.display();
}
void drawAlert(uint32_t t) {
  oled.clearDisplay();
  bool on = (t / 400) % 2; if (on) oled.drawRect(0, 0, 128, OLED_H, W);
  label("  JEEVO"); oled.setTextSize(1);
  // wrap the message over up to 5 lines
  String m = alertText; int y = 14;
  while (m.length() && y < OLED_H - 8) { int n = min((int)m.length(), 20); if ((int)m.length() > 20) { int sp = m.lastIndexOf(' ', 20); if (sp > 8) n = sp; } oled.setCursor(4, y); oled.print(m.substring(0, n).c_str()); m = m.substring(n); m.trim(); y += 10; }
  oled.display();
}

void draw() {
  static uint32_t last = millis(); uint32_t t = millis(); float dt = min(0.05f, (t - last) / 1000.0f); last = t;
  const Face *want = (t < senseUntil) ? findFace(localSense) : findFace(hubLabel);
  if (want != cur) target(want);
  if (t > nextBlink) { sBlink.t = 1; nextBlink = t + (random(100) < 20 ? 260 : 2000 + random(3500)); }
  if (sBlink.t > 0 && sBlink.x > .9) sBlink.t = 0;
  if (t > nextSacc) { saccX = random(-25, 26) / 100.0; saccY = random(-15, 16) / 100.0; nextSacc = t + 900 + random(2600); }
  Spring *all[] = {&sOpen, &sLidTH, &sLidT, &sLidB, &sMc, &sMo, &sBounce};
  for (Spring *s : all) s->step(dt);
  sGx.t = cur->gx + saccX; sGy.t = cur->gy + saccY; sGx.step(dt, 160, 17); sGy.step(dt, 160, 17);
  sSy.t = 0; sSy.step(dt, 300, 9); sBlink.step(dt, 900, 40);
  float hop = pow(fabs(sin(t / 1000.0 * PI * (0.8 + sBounce.x))), 2) * sBounce.x * 4;
  int cy = (OLED_H == 32 ? 13 : 26) - (int)hop - (int)(sSy.x * 2), gx = sGx.x * 6, gy = sGy.x * 3;
  oled.clearDisplay();
  eye(42 + gx, cy + gy, -1, t); eye(86 + gx, cy + gy, 1, t);
  if (cur->blush) for (int s = -1; s <= 1; s += 2) for (int k = -1; k <= 1; k++) oled.drawLine(64 + s * 34 + k * 4 + 1, cy + 14, 64 + s * 34 + k * 4 - 1, cy + 18, W);   // ///
  if (OLED_H == 64) mouth(64 + gx / 2, 52 - (int)hop, t);
  effects(64, cy, t, dt);
  if (millis() < noteUntil) { oled.fillRect(0, 56, 128, 8, B); small(56, noteText.substring(0, 21)); }
  if (!online) oled.fillRect(124, 60, 3, 3, W);        // tiny offline dot
  oled.display();
}

// ---- no display? the RGB LED breathes the mood ----
void led() {
  uint32_t t = millis(); float hue = hubHue, br;
  String n = (t < senseUntil) ? localSense : hubLabel; cur = findFace(n);
  if (n == "dizzy" || n == "tickled" || n == "laughing") { hue = (t / 8) % 360; br = .6; }
  else if (n == "love") { float p = fmod(t / 900.0, 1); br = (p < .12 || (p > .22 && p < .34)) ? .8 : .1; hue = 340; }
  else if (n == "sleepy" || n == "dozing") br = .05 + .1 * (sin(t / 1800.0) * .5 + .5);
  else br = .15 + .45 * (sin(t / (600.0 / (0.6 + cur->bounce))) * .5 + .5);
  float h = hue / 60.0, x = 1 - fabs(fmod(h, 2) - 1); float r = 0, g = 0, b = 0; (void)r; (void)g; (void)b;
  if (h < 1) { r = 1; g = x; } else if (h < 2) { r = x; g = 1; } else if (h < 3) { g = 1; b = x; } else if (h < 4) { g = x; b = 1; } else if (h < 5) { r = x; b = 1; } else { r = 1; b = x; }
#if LED_RGB
  rgbLedWrite(LED_PIN, r * br * 255, g * br * 255, b * br * 255);
#else
  analogWrite(LED_PIN, 255 - (int)(br * 255));          // single LED: brightness only, active low
#endif
}

// ---- network ----
void sendJson(const char *t, const char *k, const char *v) { JsonDocument d; d["t"] = t; if (k) d[k] = v; String s; serializeJson(d, s); ws.sendTXT(s); }
void sense(const char *name, uint32_t ms) { localSense = name; senseUntil = millis() + ms; if (online) sendJson("sense", "name", name); }
void onWs(WStype_t type, uint8_t *payload, size_t len) {
  if (type == WStype_CONNECTED) online = true;
  if (type == WStype_DISCONNECTED) online = false;
  if (type != WStype_TEXT) return;
  JsonDocument d; if (deserializeJson(d, payload, len)) return;
  String tt = (const char *)(d["t"] | "");
  if (tt == "alert") { alertText = (const char *)(d["text"] | ""); alertTask = (const char *)(d["taskId"] | ""); alertUntil = millis() + 90000; lastInteract = millis(); sense("surprised", 2000); return; }
  if (tt == "note") { noteText = (const char *)(d["text"] | ""); noteUntil = millis() + 6000; return; }
  if (tt != "mood") return;
  hubLabel = (const char *)(d["label"] | "content"); hubHue = d["hue"] | 150; hubTalk = d["talk"] | false;
  JsonObject in = d["info"];
  if (!in.isNull()) { info.next = (const char *)(in["next"] | ""); info.soc = in["soc"] | -1; info.range = in["range"] | -1; info.needs = in["needs"] | 0; info.tasks = in["tasks"] | 0; info.charging = in["charging"] | false; info.weather = (const char *)(in["weather"] | ""); }
}

uint16_t touchBase = 0; uint32_t touchStart = 0, lastTap = 0; int taps = 0; bool touching = false;
void setup() {
  Serial.begin(115200);
  pinMode(BOOT_PIN, INPUT_PULLUP);
  Wire.begin(SDA_PIN, SCL_PIN);
  for (uint8_t a : {0x3C, 0x3D}) { Wire.beginTransmission(a); if (Wire.endTransmission() == 0) { hasOled = OLED_BEGIN(a); Serial.printf("OLED at 0x%02X\n", a); break; } }
  if (hasOled) { oled.clearDisplay(); oled.display(); } else Serial.println("No OLED found: using the LED");
  touchBase = touchRead(TOUCH_PIN);
  target(&FACES[0]); sOpen.x = 1;
  WiFi.mode(WIFI_STA);
  wifi.addAP(WIFI_SSID, WIFI_PASS);                      // home
#ifdef WIFI2_SSID
  wifi.addAP(WIFI2_SSID, WIFI2_PASS);                    // office
#endif
#ifdef WIFI3_SSID
  wifi.addAP(WIFI3_SSID, WIFI3_PASS);                    // iPhone hotspot: the key works on the road
#endif
  wifi.run(8000);
  configTzTime("IST-5:30", "pool.ntp.org", "time.google.com");
  String path = String("/ws?body=keychain&compact=1&token=") + HUB_TOKEN;
  ws.begin(HUB_HOST, HUB_PORT, path); ws.onEvent(onWs); ws.setReconnectInterval(3000);
  NimBLEDevice::init("JeevoKey");                                     // presence beacon for a desk node later
  NimBLEDevice::getAdvertising()->setName("JeevoKey"); NimBLEDevice::getAdvertising()->start();
}

void loop() {
  static uint32_t lastWifi = 0; uint32_t now = millis();
  if (now - lastWifi > 5000) { lastWifi = now; if (wifi.run(3000) == WL_CONNECTED && !otaOn) { ArduinoOTA.setHostname("jeevo-key");
#ifdef OTA_PASS
      ArduinoOTA.setPassword(OTA_PASS);
#endif
      ArduinoOTA.begin(); otaOn = true; Serial.print("Wi-Fi ok, IP "); Serial.println(WiFi.localIP()); } }
  if (otaOn) ArduinoOTA.handle();
  ws.loop();
  bool t = touchRead(TOUCH_PIN) > touchBase * 1.4;                   // S3 touch values rise when touched
  if (t && !touching) { touching = true; touchStart = now; sSy.v -= 3; lastInteract = now; }   // squish on contact
  if (!t && touching) {
    touching = false; uint32_t held = now - touchStart;
    if (now < alertUntil) {                                            // touch = got it / done
      if (alertTask.length()) { JsonDocument a; a["t"] = "ack"; a["taskId"] = alertTask; String s2; serializeJson(a, s2); ws.sendTXT(s2); }
      alertUntil = 0; sense("proud", 2000); return;
    }
    if (held > 900) sense("cosy", 8000);
    else { taps = (now - lastTap < 450) ? taps + 1 : 1; lastTap = now; if (taps >= 3) { sense("dizzy", 5000); taps = 0; } else sense("tickled", 2500); }
  }
  // B (BOOT): one press = next page, two quick presses = "on my way", hold = "come here"
  static uint32_t bootAt = 0, lastPress = 0; static bool bootDown = false; static int presses = 0;
  if (!digitalRead(BOOT_PIN) && !bootDown) { bootDown = true; bootAt = now; lastInteract = now; }
  if (digitalRead(BOOT_PIN) && bootDown) {
    bootDown = false;
    if (now - bootAt > 800) { sendJson("lease", nullptr, nullptr); sense("excited", 2500); presses = 0; }
    else { presses++; lastPress = now; }
  }
  if (presses && now - lastPress > 350) {
    if (presses >= 2) { JsonDocument d; d["t"] = "input"; d["kind"] = "button"; d["text"] = "on my way"; String s; serializeJson(d, s); ws.sendTXT(s); sense("wink", 2000); }
    else page = (page + 1) % PAGES;
    presses = 0;
  }
  if (page && now - lastInteract > 20000) page = 0;                   // pages fall back to the face
  bool idle = now - lastInteract > 45000 && now > alertUntil;
  if (hasOled && idle != dimmed) { dimmed = idle; OLED_DIM(idle); }
  static uint32_t lastDraw = 0; if (now - lastDraw > 33) { lastDraw = now; if (!hasOled) led(); else if (now < alertUntil) drawAlert(now); else if (page) drawPage(); else draw(); }
}
