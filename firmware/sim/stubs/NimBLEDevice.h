#pragma once
#include "Arduino.h"
struct NimBLEAdvertisedDevice { std::string getName() const { return ""; } int getRSSI() const { return -50; } };
struct NimBLEAdvertising { bool setName(const std::string &) { return true; } bool start() { return true; } };
struct NimBLEScanResults { int getCount() { return 0; } const NimBLEAdvertisedDevice *getDevice(int) { return nullptr; } };
struct NimBLEScan { void setActiveScan(bool) {} NimBLEScanResults getResults(uint32_t, bool = false) { return {}; } void clearResults() {} };
struct NimBLEDevice { static void init(const std::string &) {} static NimBLEAdvertising *getAdvertising() { static NimBLEAdvertising a; return &a; } static NimBLEScan *getScan() { static NimBLEScan s; return &s; } };
