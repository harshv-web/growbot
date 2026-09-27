#pragma once
#include "Arduino.h"
#define WIFI_STA 1
struct WiFiClass { void mode(int) {} void begin(const char *, const char *) {} int status() { return 3; } String localIP() { return ""; } };
extern WiFiClass WiFi;
#define WL_CONNECTED 3
