// Jeevo "Halo" case — prototype firmware
// Hardware: ESP32-C3 SuperMini + 1.54" 200x200 black/white e-paper (SSD1681, e.g. GDEY0154D67)
//           + 150 mAh LiPo + TP4056 charger, all inside a ~7 mm printed back-pack on the iPhone case.
// Libraries: GxEPD2, ArduinoJson, WiFi, HTTPClient
// Model: e-paper keeps its image with zero power. The board wakes every 10 minutes, and if it can
// reach home Wi-Fi it asks the Soul Core for the current glyph; it redraws only when something changed.
// v2: BLE from the iOS companion app for updates outside home.
#include <GxEPD2_BW.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// SPI pins for ESP32-C3 SuperMini — verify for your wiring
#define EPD_CS 7
#define EPD_DC 1
#define EPD_RST 2
#define EPD_BUSY 3
GxEPD2_BW<GxEPD2_154_GDEY0154D67, GxEPD2_154_GDEY0154D67::HEIGHT> epd(GxEPD2_154_GDEY0154D67(EPD_CS, EPD_DC, EPD_RST, EPD_BUSY));

const char *SSID = "home-2g";          // put real values in a secrets.h, not in git
const char *PASS = "********";
const char *URL = "https://soul.example.workers.dev/presence/halo";   // returns {rev, label, line, eyeOpen, mouth}
RTC_DATA_ATTR int lastRev = -1;

void drawGlyph(const char *label, const char *line, float eyeOpen, float mouth) {
  epd.setFullWindow(); epd.firstPage();
  do {
    epd.fillScreen(GxEPD_WHITE);
    int eh = max(6, (int)(46 * eyeOpen));
    epd.fillRoundRect(46, 70 - eh / 2, 40, eh, min(40, eh) / 2, GxEPD_BLACK);
    epd.fillRoundRect(114, 70 - eh / 2, 40, eh, min(40, eh) / 2, GxEPD_BLACK);
    int c = mouth * 12;
    for (int x = -24; x <= 24; x++) epd.fillCircle(100 + x, 118 - c * (1 - x * x / 576.0), 2, GxEPD_BLACK);
    epd.setTextColor(GxEPD_BLACK);
    epd.setCursor(12, 160); epd.print(label);
    epd.setCursor(12, 182); epd.print(line);          // e.g. "Metro 8:24 · rain 4pm"
  } while (epd.nextPage());
  epd.hibernate();
}

void setup() {
  epd.init(115200, lastRev < 0, 2, false);
  WiFi.begin(SSID, PASS);
  for (int i = 0; i < 40 && WiFi.status() != WL_CONNECTED; i++) delay(100);
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http; http.begin(URL);
    if (http.GET() == 200) {
      JsonDocument d;
      if (!deserializeJson(d, http.getString()) && (int)d["rev"] != lastRev) {
        lastRev = d["rev"];
        drawGlyph(d["label"] | "content", d["line"] | "", d["eyeOpen"] | 0.8, d["mouth"] | 0.3);
      }
    }
    http.end();
  } else if (lastRev < 0) {
    drawGlyph("sleeping", "tap the keychain to wake me", 0.1, 0.1);
    lastRev = 0;
  }
  WiFi.disconnect(true);
  esp_sleep_enable_timer_wakeup(10ULL * 60 * 1000000);   // 10 min
  esp_deep_sleep_start();
}
void loop() {}
