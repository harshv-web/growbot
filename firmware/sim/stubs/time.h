#pragma once
#include_next <time.h>
#include <stdint.h>
inline void configTzTime(const char *, const char *, const char * = nullptr, const char * = nullptr) {}
inline bool getLocalTime(struct tm *t, uint32_t = 5000) { time_t now = 1790000000 + 19800; *t = *gmtime(&now); return true; }
