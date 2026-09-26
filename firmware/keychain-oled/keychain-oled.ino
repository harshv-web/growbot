// Jeevo Key v0 — ESP32-S3 + 128x64 OLED (SSD1306, I2C) + a wire as a touch pad.
// Pixel eyes that show the soul's mood from the hub, plus feelings only the keychain has:
//   touch = tickled, long touch = cosy, triple tap = dizzy, BOOT short = "on my way", BOOT long = "come here".
// Libraries (Arduino Library Manager): Adafruit SSD1306, Adafruit GFX, WebSockets (Markus Sattler), ArduinoJson 7, NimBLE-Arduino.
// Wiring: OLED SDA→GPIO8, SCL→GPIO9, VCC→3V3, GND→GND. Touch: a ~10 cm wire (or foil) on GPIO4. USB power for now.
// If your OLED is a 1.3" SH1106, swap to the Adafruit_SH110X library.
#include <WiFi.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include <NimBLEDevice.h>
#include "secrets.h"   // WIFI_SSID, WIFI_PASS, HUB_HOST, HUB_PORT, HUB_TOKEN  (see secrets.example.h)

#define SDA_PIN 8
#define SCL_PIN 9
#define TOUCH_PIN 4
#define BOOT_PIN 0
Adafruit_SSD1306 oled(128, 64, &Wire, -1);
WebSocketsClient ws;

struct Mood { String eyes = "normal"; float open = 0.8, mouth = 0.3; bool talk = false; String text = "Content"; } mood;
String localSense = ""; uint32_t senseUntil = 0;
uint32_t lastBlink = 0, touchStart = 0, lastTap = 0; int taps = 0; bool touching = false, online = false;
uint16_t touchBase = 0;

void sendJson(const char *t, const char *k, const char *v) {
  JsonDocument d; d["t"] = t; if (k) d[k] = v; String s; serializeJson(d, s); ws.sendTXT(s);
}
void sense(const char *name, uint32_t ms) { localSense = name; senseUntil = millis() + ms; if (online) sendJson("sense", "name", name); }

void onWs(WStype_t type, uint8_t *payload, size_t len) {
  if (type == WStype_CONNECTED) online = true;
  if (type == WStype_DISCONNECTED) online = false;
  if (type != WStype_TEXT) return;
  JsonDocument d; if (deserializeJson(d, payload, len)) return;
  if (String((const char *)d["t"]) != "mood") return;
  mood.eyes = (const char *)(d["eyes"] | "normal"); mood.open = d["eyeOpen"] | 0.8; mood.mouth = d["mouth"] | 0.3;
  mood.talk = d["talk"] | false; mood.text = (const char *)(d["text"] | "Content");
}

// ---- drawing: every eye style the tablet has, in 1-bit ----
void eye(int cx, int cy, const String &st, int side, float open, uint32_t t) {
  int w = 26, h = max(2, (int)(30 * open));
  if (st == "happy")      { for (int i = 0; i < 3; i++) oled.drawCircleHelper(cx, cy + 6 + i, 12, 1 | 2, SSD1306_WHITE); return; }
  if (st == "heart")      { oled.fillCircle(cx - 5, cy - 3, 6, 1); oled.fillCircle(cx + 5, cy - 3, 6, 1); oled.fillTriangle(cx - 11, cy - 1, cx + 11, cy - 1, cx, cy + 12, 1); return; }
  if (st == "spiral")     { float a0 = t / 150.0; for (float a = 0; a < 14; a += 0.25) { float r = a * 0.9; oled.drawPixel(cx + cos(a + a0) * r, cy + sin(a + a0) * r, 1); } return; }
  if (st == "tired")      { oled.fillRoundRect(cx - w / 2, cy + 2, w, 5, 2, 1); return; }
  if (st == "narrow" || st == "squint") { oled.fillRoundRect(cx - w / 2, cy - 3, w, 7, 3, 1); return; }
  if (st == "soft")       { oled.fillRoundRect(cx - w / 2, cy - 4, w, 10, 5, 1); return; }
  if (st == "wide")       { oled.fillRoundRect(cx - w / 2 - 2, cy - 18, w + 4, 36, 12, 1); return; }
  if (st == "up")         { oled.fillRoundRect(cx - w / 2 + 3, cy - 18, w - 6, 24, 8, 1); return; }
  oled.fillRoundRect(cx - w / 2, cy - h / 2, w, h, min(w, h) / 3, 1);
  if (st == "sad")   oled.fillTriangle(cx - w / 2 - 1, cy - h / 2 - 1, cx + w / 2 + 1, cy - h / 2 - 1, side > 0 ? cx + w / 2 + 1 : cx - w / 2 - 1, cy - h / 2 + 10, 0);
  if (st == "angry") oled.fillTriangle(cx - w / 2 - 1, cy - h / 2 - 1, cx + w / 2 + 1, cy - h / 2 - 1, side > 0 ? cx - w / 2 - 1 : cx + w / 2 + 1, cy - h / 2 + 10, 0);
}
void draw() {
  uint32_t t = millis();
  String st = mood.eyes; float open = mood.open; float mouth = mood.mouth; bool talk = mood.talk;
  if (t < senseUntil) {                         // the keychain's own feelings win for a moment
    if (localSense == "tickled") { st = "squint"; mouth = 1; }
    if (localSense == "cosy")    { st = "soft"; open = 0.3; mouth = 0.5; }
    if (localSense == "dizzy")   { st = "spiral"; mouth = -0.2; }
  }
  float bt = (t - lastBlink) / 140.0; if (t - lastBlink > 3500 + random(2500)) lastBlink = t;
  if (st == "normal" && bt < 1) open *= 1 - sin(bt * PI);
  oled.clearDisplay();
  eye(40, 26, st, -1, open, t); eye(88, 26, st, 1, open, t);
  int c = (int)(mouth * 5);
  if (talk) oled.fillRoundRect(58, 50, 12, 3 + (t / 90) % 5, 3, 1);
  else for (int x = -9; x <= 9; x++) oled.drawPixel(64 + x, 52 - c * (1 - x * x / 81.0), 1);
  if (!online) { oled.drawPixel(125, 2, 1); oled.drawPixel(126, 2, 1); }       // tiny offline mark
  oled.display();
}

void setup() {
  pinMode(BOOT_PIN, INPUT_PULLUP);
  Wire.begin(SDA_PIN, SCL_PIN);
  oled.begin(SSD1306_SWITCHCAPVCC, 0x3C); oled.clearDisplay(); oled.display();
  touchBase = touchRead(TOUCH_PIN);
  WiFi.mode(WIFI_STA); WiFi.begin(WIFI_SSID, WIFI_PASS);
  String path = String("/ws?body=keychain&compact=1&token=") + HUB_TOKEN;
  ws.begin(HUB_HOST, HUB_PORT, path); ws.onEvent(onWs); ws.setReconnectInterval(3000);
  NimBLEDevice::init("JeevoKey");                                     // presence beacon for the desk node
  NimBLEDevice::getAdvertising()->setName("JeevoKey"); NimBLEDevice::getAdvertising()->start();
}

void loop() {
  ws.loop();
  uint32_t now = millis();
  // touch: S3 touch values rise when touched
  bool t = touchRead(TOUCH_PIN) > touchBase * 1.4;
  if (t && !touching) { touching = true; touchStart = now; }
  if (!t && touching) {
    touching = false; uint32_t held = now - touchStart;
    if (held > 900) sense("cosy", 8000);
    else { taps = (now - lastTap < 450) ? taps + 1 : 1; lastTap = now; if (taps >= 3) { sense("dizzy", 5000); taps = 0; } else sense("tickled", 2500); }
  }
  // BOOT button: short = on my way, long = pull the soul into the keychain
  static uint32_t bootAt = 0; static bool bootDown = false;
  if (!digitalRead(BOOT_PIN) && !bootDown) { bootDown = true; bootAt = now; }
  if (digitalRead(BOOT_PIN) && bootDown) {
    bootDown = false;
    if (now - bootAt > 800) sendJson("lease", nullptr, nullptr);
    else { JsonDocument d; d["t"] = "input"; d["kind"] = "button"; d["text"] = "on my way"; String s; serializeJson(d, s); ws.sendTXT(s); }
  }
  static uint32_t lastDraw = 0; if (now - lastDraw > 33) { lastDraw = now; draw(); }
}
