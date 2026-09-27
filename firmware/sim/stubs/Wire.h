#pragma once
#include "Arduino.h"
struct TwoWire { bool begin(int, int) { return true; } void beginTransmission(uint8_t) {} uint8_t endTransmission() { return 0; } };
extern TwoWire Wire;
