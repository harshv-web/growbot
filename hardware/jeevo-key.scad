// Jeevo Key v1: pocket body for a Seeed XIAO ESP32-S3 + a 1.3" I2C OLED, with a keyring loop.
// Stack, front to back: face window → OLED module → XIAO (USB-C pointing down) → antenna + LiPo → room for a LiPo later.
// Solder the four OLED wires and the touch wire straight onto the boards (no header pins) to keep it thin.
// Touch: stick copper tape or foil inside the back plate and solder it to D3 — squeeze the back to pet it.
// Print: shell face-down, back plate flat. 0.16–0.2 mm layers, no supports. Print part = "fit" first.
$fn = 48;
part = "all";            // "shell" | "back" | "fit" | "all"

// ---------- your parts (mm): measure and adjust ----------
oled_pcb   = [36, 34];   // 1.3" OLED module
oled_t     = 4.5;        // module thickness at the glass (PCB + glass)
oled_win   = [30.5, 16];
oled_win_up = 3;         // pixels' centre above the PCB centre (check yours; flip the sign if the pins are at the bottom)
mini       = [17.8, 21, 4.5]; // XIAO ESP32-S3: width, length, thickness (Super Mini: 18 x 23 x 4)
lipo_t     = 0;          // 0 today; 5 when you add a ~400 mAh 3.7 V LiPo (the XIAO charges it through USB-C)
tol        = 0.35;

wall = 1.8;
inner = [oled_pcb[0] + 2 * tol, oled_t + 2.5 + mini[2] + lipo_t + 1.5, oled_pcb[1] + 2 * tol];   // width x depth x height
body  = [inner[0] + 2 * wall, inner[1] + 2 * wall, inner[2] + 2 * wall];
r     = 6;

module rbox(s, r) { hull() for (x = [r, s[0] - r], y = [r, s[1] - r], z = [r, s[2] - r]) translate([x, y, z]) sphere(r); }

module shell() {
  difference() {
    union() {
      rbox(body, r);
      // keyring loop on top
      translate([body[0] / 2, body[1] / 2, body[2] - 1]) rotate([90, 0, 0]) difference() {
        hull() { cylinder(r = 5, h = 5, center = true); translate([0, -4, 0]) cylinder(r = 5, h = 5, center = true); }
        cylinder(r = 2.4, h = 7, center = true);
      }
    }
    translate([wall, wall, wall]) rbox(inner, max(1, r - wall));
    // open back
    translate([wall + 1.5, body[1] - wall - 1, wall + 1.5]) cube([inner[0] - 3, wall + 2, inner[2] - 3]);
    // face window with bevel
    translate([body[0] / 2, 0, body[2] / 2 + oled_win_up]) hull() {
      translate([0, wall + .01, 0]) cube([oled_win[0], .02, oled_win[1]], center = true);
      translate([0, -.01, 0]) cube([oled_win[0] + 2 * wall, .02, oled_win[1] + 2 * wall], center = true);
    }
    // USB-C at the bottom, lined up with the XIAO behind the OLED
    translate([body[0] / 2 - 5, wall + oled_t + 2.5 + mini[2] / 2 - 2, -1]) cube([10, 4.5, wall + 2]);
  }
  // ribs that hold the OLED against the front wall
  for (sx = [-1, 1]) translate([body[0] / 2 + sx * (inner[0] / 2 - .6) - .6, wall + oled_t + tol, wall + 4]) cube([1.2, 1.2, inner[2] - 8]);
  // a cradle ledge for the board (it stands upright, USB-C down)
  translate([body[0] / 2 - mini[0] / 2 - 1.2 - tol, wall + oled_t + 2.5 - 1.2, wall]) difference() {
    cube([mini[0] + 2.4 + 2 * tol, mini[2] + 2.4 + tol, 4]);
    translate([1.2, 1.2, -.1]) cube([mini[0] + 2 * tol, mini[2] + tol, 5]);
  }
}

module back() {
  o = [inner[0] - 3 - 2 * tol, inner[2] - 3 - 2 * tol];
  translate([-2, 0, -2]) cube([o[0] + 4, 1.2, o[1] + 4]);
  translate([0, 1.2, 0]) difference() { cube([o[0], 1.6, o[1]]); translate([1.2, -.1, 1.2]) cube([o[0] - 2.4, 1.8, o[1] - 2.4]); }
}

if (part == "shell") rotate([-90, 0, 0]) shell();
if (part == "back") rotate([90, 0, 0]) back();
if (part == "fit") intersection() { shell(); translate([-1, -1, -1]) cube([body[0] + 2, wall + 2, body[2] + 20]); }
if (part == "all") { shell(); translate([wall + 1.5 + tol, body[1] + 10, wall + 1.5 + tol]) back(); }
echo(str("Jeevo Key outer size (w x d x h): ", body[0], " x ", body[1], " x ", body[2] + 9, " mm"));
