#pragma once
#include "WiFi.h"
struct WiFiMulti { bool addAP(const char *, const char *) { return true; } uint8_t run(uint32_t = 5000) { return WL_CONNECTED; } };
