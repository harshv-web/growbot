// Jeevo desk node v0 — classic ESP32 + a wire/foil touch pad + onboard LED.
// Pet pad on the desk, "keys are near" presence (scans for the JeevoKey BLE beacon), status LED.
// Later: LD2410C radar on UART2, IR LED on GPIO 26, AHT20 on I2C.
// Libraries: WebSockets (Markus Sattler), ArduinoJson 7, NimBLE-Arduino.
#include <WiFi.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include <NimBLEDevice.h>
#include "secrets.h"   // same fields as the keychain's secrets.h

#define TOUCH_PIN T0   // GPIO4
#define LED_PIN 2
WebSocketsClient ws;
bool online = false, keysNear = false;
uint16_t base = 0; float glow = 0; uint32_t lastScan = 0;

void onWs(WStype_t type, uint8_t *p, size_t n) {
  if (type == WStype_CONNECTED) online = true;
  if (type == WStype_DISCONNECTED) online = false;
  if (type == WStype_TEXT) { JsonDocument d; if (!deserializeJson(d, p, n) && d["glow"]) glow = 1; }
}
void input(const char *kind, const char *text) {
  JsonDocument d; d["t"] = "input"; d["kind"] = kind; d["text"] = text; String s; serializeJson(d, s); ws.sendTXT(s);
}

void setup() {
  pinMode(LED_PIN, OUTPUT);
  base = touchRead(TOUCH_PIN);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  ws.begin(HUB_HOST, HUB_PORT, String("/ws?body=desk&compact=1&token=") + HUB_TOKEN);
  ws.onEvent(onWs); ws.setReconnectInterval(3000);
  NimBLEDevice::init("");
}

void loop() {
  ws.loop();
  uint32_t now = millis();
  // classic ESP32 touch values FALL when touched
  static bool was = false; bool t = touchRead(TOUCH_PIN) < base * 0.6;
  if (t && !was && online) { JsonDocument d; d["t"] = "input"; d["kind"] = "touch"; d["from"] = "desk"; String s; serializeJson(d, s); ws.sendTXT(s); glow = 1; }
  was = t;
  // every 20 s: are the keys (JeevoKey beacon) on the desk?
  if (now - lastScan > 20000 && online) {
    lastScan = now;
    NimBLEScan *scan = NimBLEDevice::getScan(); scan->setActiveScan(false);
    NimBLEScanResults r = scan->getResults(3000, false);
    bool found = false;
    for (int i = 0; i < r.getCount(); i++) { const NimBLEAdvertisedDevice *d = r.getDevice(i); if (d->getName() == "JeevoKey" && d->getRSSI() > -70) found = true; }
    if (found != keysNear) { keysNear = found; input("telemetry", found ? "keys arrived at the desk" : "keys left the desk"); }
    scan->clearResults();
  }
  // LED: breathes when online, pulses on glow
  float b = online ? (0.15 + 0.1 * sin(now / 900.0)) : 0; if (glow > 0) { b = max(b, glow); glow *= 0.97; }
  analogWrite(LED_PIN, (int)(b * 255));
  delay(15);
}
