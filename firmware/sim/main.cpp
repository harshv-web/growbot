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
  fprintf(f, "]"); fclose(f);
}
