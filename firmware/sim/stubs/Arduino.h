#pragma once
// Host stand-ins for the Arduino-ESP32 core: enough to type-check sketches with g++.
#include <cstdint>
#include <cmath>
#include <cstdio>
#include <string>
#include <algorithm>
#include <cstdlib>
using std::min; using std::max;           // ESP32 core 3.x: same-type templates, like here
#define PI 3.14159265358979
#define constrain(a, l, h) ((a) < (l) ? (l) : ((a) > (h) ? (h) : (a)))
#define INPUT_PULLUP 2
#define INPUT 0
#define OUTPUT 1
#define HIGH 1
#define LOW 0
#define ESP_ARDUINO_VERSION_MAJOR 3
extern uint32_t g_ms; inline uint32_t millis() { return g_ms; }
inline long random(long a) { return rand() % a; }
inline long random(long a, long b) { return a + rand() % (b - a); }
inline void pinMode(int, int) {}
inline int digitalRead(int) { return 1; }
inline void digitalWrite(int, int) {}
inline uint16_t touchRead(int) { return 0; }
inline void rgbLedWrite(int, uint8_t, uint8_t, uint8_t) {}
inline void delay(uint32_t) {}
#define T0 4
inline void analogWrite(int, int) {}
class String : public std::string {
 public:
  String() {} String(const char *s) : std::string(s ? s : "") {} String(const std::string &s) : std::string(s) {}
  String(int v) : std::string(std::to_string(v)) {}
  const char *c_str() const { return std::string::c_str(); }
  bool operator==(const char *o) const { return std::string(*this) == o; }
  bool operator==(const String &o) const { return std::string(*this) == std::string(o); }
  bool operator!=(const char *o) const { return !(*this == o); }
  String operator+(const char *o) const { return String(std::string(*this) + o); }
  String operator+(const String &o) const { return String(std::string(*this) + std::string(o)); }
  int toInt() const { return atoi(c_str()); }
  size_t write(uint8_t c) { push_back((char)c); return 1; }
  size_t write(const uint8_t *b, size_t n) { append((const char *)b, n); return n; }
};
inline String operator+(const char *a, const String &b) { return String(std::string(a) + std::string(b)); }
struct HardwareSerial { void begin(long) {} template <class... A> void printf(const char *, A...) {} template <class T> void println(T) {} template <class T> void print(T) {} };
extern HardwareSerial Serial;

#include "Print.h"
class __FlashStringHelper;
#define F(s) (reinterpret_cast<const __FlashStringHelper *>(s))
#define PROGMEM
#define pgm_read_byte(a) (*(const uint8_t *)(a))
#define pgm_read_word(a) (*(const uint16_t *)(a))
#define pgm_read_dword(a) (*(const uint32_t *)(a))
#define pgm_read_ptr(a) (*(void *const *)(a))
#define radians(d) ((d) * PI / 180.0)
#define degrees(r) ((r) * 180.0 / PI)
