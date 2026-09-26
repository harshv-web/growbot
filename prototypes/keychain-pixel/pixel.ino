// Jeevo "Pixel" keychain — prototype firmware
// Board: Waveshare ESP32-S3-Touch-LCD-1.28 (round 240x240 GC9A01, CST816S touch, QMI8658 IMU, LiPo charger)
// Libraries: Arduino_GFX_Library, NimBLE-Arduino, ArduinoJson
// Pins below follow Waveshare's wiki for this board — verify against your revision before flashing.
// Behaviour: the soul's mood arrives over BLE as JSON; the face animates locally at 30 fps.
//   shake = wake + "greeted"; tap = "petted" (glow); long press = "transfer here" request;
//   tilt = eyes look toward gravity; idle 20 s = sleep (display off, light sleep, wake on IMU motion).
#include <Arduino_GFX_Library.h>
#include <NimBLEDevice.h>
#include <ArduinoJson.h>
#include <Wire.h>

#define LCD_DC 8
#define LCD_CS 9
#define LCD_SCK 10
#define LCD_MOSI 11
#define LCD_RST 12
#define LCD_BL 40
#define I2C_SDA 6
#define I2C_SCL 7
#define TOUCH_INT 5
#define VIBE_PIN 16   // add a coin vibration motor via a small MOSFET (not on the board)

Arduino_DataBus *bus = new Arduino_ESP32SPI(LCD_DC, LCD_CS, LCD_SCK, LCD_MOSI, GFX_NOT_DEFINED);
Arduino_GFX *panel = new Arduino_GC9A01(bus, LCD_RST, 0, true);
Arduino_Canvas *gfx = new Arduino_Canvas(240, 240, panel);

static const char *SVC = "6a1e0001-4a45-4556-4f00-736f756c0001";   // Jeevo soul service
static const char *MOOD = "6a1e0002-4a45-4556-4f00-736f756c0001";  // write: mood JSON
static const char *EVT = "6a1e0003-4a45-4556-4f00-736f756c0001";   // notify: touch/shake events
NimBLECharacteristic *evtChar;

struct Mood { float eyeOpen = 0.8, pupil = 0.6, lidTilt = 0, mouth = 0.3; uint16_t hue = 42; bool glow = false; char label[12] = "content"; } mood;
float lookX = 0, lookY = 0, blink = 0; uint32_t lastBlink = 0, lastActive = 0;

uint16_t hsv(uint16_t h, float s, float v) {
  float c = v * s, x = c * (1 - fabs(fmod(h / 60.0, 2) - 1)), m = v - c, r, g, b;
  if (h < 60) { r = c; g = x; b = 0; } else if (h < 120) { r = x; g = c; b = 0; } else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; } else if (h < 300) { r = x; g = 0; b = c; } else { r = c; g = 0; b = x; }
  return gfx->color565((r + m) * 255, (g + m) * 255, (b + m) * 255);
}

class MoodCB : public NimBLECharacteristicCallbacks {
  void onWrite(NimBLECharacteristic *c, NimBLEConnInfo &) override {
    JsonDocument d; if (deserializeJson(d, c->getValue().c_str())) return;
    mood.eyeOpen = d["eyeOpen"] | mood.eyeOpen; mood.pupil = d["pupil"] | mood.pupil;
    mood.lidTilt = d["lidTilt"] | mood.lidTilt; mood.mouth = d["mouth"] | mood.mouth;
    mood.hue = d["hue"] | mood.hue; mood.glow = d["glow"] | false;
    strlcpy(mood.label, d["label"] | mood.label, sizeof(mood.label));
    lastActive = millis();
  }
};

void sendEvent(const char *name) {
  if (!evtChar) return;
  char buf[48]; snprintf(buf, sizeof buf, "{\"e\":\"%s\"}", name);
  evtChar->setValue(buf); evtChar->notify();
}

void drawEye(int cx, int cy, bool left) {
  float open = mood.eyeOpen * (1 - blink);
  int w = 62, h = max(4, (int)(78 * open));
  uint16_t col = hsv(mood.hue, 0.65, mood.glow ? 1.0 : 0.9);
  gfx->fillRoundRect(cx - w / 2, cy - h / 2, w, h, min(w, h) / 2, col);
  int pr = 12 + mood.pupil * 10;
  if (h > 2 * pr) gfx->fillCircle(cx + lookX * 10, cy + lookY * 8, pr, BLACK);
  int tilt = mood.lidTilt * 18 * (left ? 1 : -1);                       // angry/sad brows
  gfx->fillTriangle(cx - w / 2 - 4, cy - h / 2 - 6 + tilt, cx + w / 2 + 4, cy - h / 2 - 6 - tilt, cx - w / 2 - 4, cy - h / 2 - 30, BLACK);
}

void drawFace() {
  gfx->fillScreen(BLACK);
  if (mood.glow) for (int r = 118; r > 108; r -= 3) gfx->drawCircle(120, 120, r, hsv(mood.hue, 0.5, 0.5));
  drawEye(78, 108, true); drawEye(162, 108, false);
  int curve = mood.mouth * 14;                                            // smile (+) or frown (-)
  for (int x = -22; x <= 22; x++) { int y = 168 - curve * (1 - (x * x) / 484.0); gfx->fillCircle(120 + x, y, 2, hsv(mood.hue, 0.4, 0.85)); }
  gfx->flush();
}

void setup() {
  pinMode(LCD_BL, OUTPUT); digitalWrite(LCD_BL, HIGH);
  pinMode(VIBE_PIN, OUTPUT);
  gfx->begin(); Wire.begin(I2C_SDA, I2C_SCL);
  // TODO: init QMI8658 (accel for shake/tilt) and CST816S (tap / long-press) — see Waveshare demo code.
  NimBLEDevice::init("Jeevo Pixel");
  NimBLEServer *srv = NimBLEDevice::createServer();
  NimBLEService *svc = srv->createService(SVC);
  svc->createCharacteristic(MOOD, NIMBLE_PROPERTY::WRITE)->setCallbacks(new MoodCB());
  evtChar = svc->createCharacteristic(EVT, NIMBLE_PROPERTY::NOTIFY);
  svc->start();
  NimBLEDevice::getAdvertising()->addServiceUUID(SVC);
  NimBLEDevice::getAdvertising()->start();   // also acts as the "keys at home" beacon for the dock
  lastActive = millis();
}

void loop() {
  uint32_t now = millis();
  float blinkEvery = 2200 + (1 - mood.eyeOpen) * 3000;
  if (now - lastBlink > blinkEvery) { lastBlink = now; }
  float bt = (now - lastBlink) / 140.0; blink = bt < 1 ? sin(bt * PI) : 0;
  // lookX/lookY: set from accelerometer tilt once the IMU is wired (eyes follow gravity).
  drawFace();
  if (now - lastActive > 20000) { digitalWrite(LCD_BL, LOW); /* light sleep until IMU wake interrupt */ }
  delay(33);
}
