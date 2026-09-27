// Copy to secrets.h (git-ignored) and fill in.
#define WIFI_SSID "home-2g"          // home Wi-Fi (the ESP32 joins 2.4 GHz only)
#define WIFI_PASS "********"
// #define WIFI2_SSID "office-wifi"  // optional: office
// #define WIFI2_PASS "********"
// #define WIFI3_SSID "Harsh's iPhone" // optional: your iPhone hotspot (turn on "Maximise Compatibility" for 2.4 GHz)
// #define WIFI3_PASS "********"
#define HUB_HOST "192.168.1.50"      // the Fire 7's Wi-Fi IP (jeevo doctor prints it), or its Tailscale IP
#define HUB_PORT 8047
#define HUB_TOKEN ""                 // same as HUB_TOKEN in hub/secrets.json (leave "" at first)
// #define OTA_PASS "pick-one"       // lets you flash new firmware over Wi-Fi (Arduino IDE → Port → jeevo-key)
