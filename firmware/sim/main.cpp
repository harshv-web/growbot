#include "Arduino.h"
#include "WiFi.h"
#include "Wire.h"
uint32_t g_ms = 1000; HardwareSerial Serial; WiFiClass WiFi; TwoWire Wire;
#include "sketch.inc"
int main() {
  setup(); FILE *f = fopen("frames.json", "w"); fprintf(f, "[");
  for (int i = 0; i < NFACES; i++) {
    hubLabel = FACES[i].name; hubHue = 200; hubTalk = false;
    for (int k = 0; k < 45; k++) { g_ms += 33; draw(); }
    fprintf(f, "%s{\"n\":\"%s\",\"b\":\"", i ? "," : "", FACES[i].name);
    for (int p = 0; p < 128 * 64; p++) fputc(oled.buf[p] ? '1' : '0', f);
    fprintf(f, "\"}");
  }
  // the pages and an alert, with sample data
  info.next = "10:30 Design crit"; info.soc = 63; info.range = 71; info.charging = false; info.tasks = 4; info.needs = 2; info.weather = "24C rain";
  const char *names[] = {"", "page: next", "page: scooter", "page: today", "page: clock"};
  for (int pg = 1; pg < PAGES; pg++) {
    page = pg; drawPage();
    fprintf(f, ",{\"n\":\"%s\",\"b\":\"", names[pg]); for (int p = 0; p < 128 * 64; p++) fputc(oled.buf[p] ? '1' : '0', f); fprintf(f, "\"}");
  }
  alertText = "Reminder: pay rent. Touch me when it's done."; g_ms = 800; drawAlert(g_ms);
  fprintf(f, ",{\"n\":\"alert\",\"b\":\""); for (int p = 0; p < 128 * 64; p++) fputc(oled.buf[p] ? '1' : '0', f); fprintf(f, "\"}");
  fprintf(f, "]"); fclose(f);
}
