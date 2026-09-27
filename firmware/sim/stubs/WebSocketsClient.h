#pragma once
#include "Arduino.h"
enum WStype_t { WStype_ERROR, WStype_DISCONNECTED, WStype_CONNECTED, WStype_TEXT, WStype_BIN };
class WebSocketsClient { public:
  void begin(const char *, uint16_t, String) {} void begin(String, uint16_t, String) {}
  void onEvent(void (*)(WStype_t, uint8_t *, size_t)) {} void setReconnectInterval(unsigned long) {} void loop() {}
  bool sendTXT(String &) { return true; } bool sendTXT(const char *) { return true; } };
