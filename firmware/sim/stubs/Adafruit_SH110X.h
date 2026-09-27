#pragma once
#include "Adafruit_GFX.h"
#include "Wire.h"
class Adafruit_SH1106G : public Adafruit_GFX { public:
  uint8_t buf[128 * 64];
  Adafruit_SH1106G(uint16_t w, uint16_t h, TwoWire *, int8_t) : Adafruit_GFX(w, h) { clearDisplay(); }
  bool begin(uint8_t = 0x3C, bool = true) { return true; }
  void drawPixel(int16_t x, int16_t y, uint16_t c) override { if (x >= 0 && x < 128 && y >= 0 && y < 64) buf[y * 128 + x] = c; }
  void clearDisplay() { memset(buf, 0, sizeof buf); } void display() {} };
