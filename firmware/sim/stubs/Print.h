#pragma once
#include <cstring>
class Print { public:
  virtual size_t write(uint8_t) = 0;
  virtual size_t write(const uint8_t *b, size_t n) { size_t k = 0; while (n--) k += write(*b++); return k; }
  size_t print(const char *s) { return write((const uint8_t *)s, strlen(s)); }
  size_t print(char c) { return write((uint8_t)c); }
  size_t print(int v) { return print(std::to_string(v).c_str()); }
  size_t println(const char *s) { return print(s) + print("\n"); }
  virtual ~Print() {} };
