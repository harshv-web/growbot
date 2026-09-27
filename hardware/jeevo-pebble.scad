// Jeevo Pebble v1: a little desk body for an ESP32-S3 board + a 1.3" I2C OLED (SH1106).
// It sits by your monitor, pulls faces, and you pat its head (copper tape inside the top → D3 on the XIAO).
// Two parts: the shell (print face-down, no supports except the ears) and the back plate (print flat).
// MEASURE YOUR PARTS with a ruler and fix the numbers in "your parts". Print part = "fit" first (15 min):
// it is only the front wall, so you can check the window and the OLED pocket before the full print.
$fn = 48;
part = "all";            // "shell" | "back" | "fit" | "all"

// ---------- your parts (mm) ----------
board   = [21, 17.8];    // Seeed XIAO ESP32-S3, length x width (Super Mini 23 x 18; DevKitC-1 about 70 x 28.5)
board_h = 6;             // board height with wires soldered on (about 12 with header pins)
usb_z   = 2.5;           // centre of the USB-C port above the floor rails
oled_pcb = [36, 34];     // 1.3" I2C OLED module board
oled_win = [30.5, 16];   // visible pixel area, plus a little
oled_win_up = 3;         // window centre above the PCB centre (the pixels sit toward the pin side's opposite edge; check yours)
tol     = 0.4;           // loosen if parts are tight on your printer

// ---------- body ----------
wall = 2.2;
body = [max(board[0], oled_pcb[0]) + 2 * wall + 14, board[1] + 2 * wall + 14, 62];   // width x depth x height
r    = 9;                // corner roundness: bigger = more pebble
oled_z = body[2] - 22;   // face height on the body
ears = true;

module rbox(s, r) { hull() for (x = [r, s[0] - r], y = [r, s[1] - r], z = [r, s[2] - r]) translate([x, y, z]) sphere(r); }

module shell() {
  difference() {
    union() {
      rbox(body, r);
      if (ears) for (x = [body[0] * .22, body[0] * .78]) translate([x, body[1] / 2, body[2] - 3]) scale([1, .8, .7]) sphere(8);
    }
    // hollow
    translate([wall, wall, wall]) rbox([body[0] - 2 * wall, body[1] - 2 * wall, body[2] - 2 * wall], r - wall);
    // open back (the back plate closes it)
    translate([wall + 2, body[1] - wall - 1, wall + 2]) cube([body[0] - 2 * wall - 4, wall + 2, body[2] - 2 * wall - 4]);
    // face window with a soft bevel
    translate([body[0] / 2, 0, oled_z]) hull() {
      translate([0, wall + .01, 0]) cube([oled_win[0], .02, oled_win[1]], center = true);
      translate([0, -.01, 0]) cube([oled_win[0] + 2 * wall, .02, oled_win[1] + 2 * wall], center = true);
    }
    // USB-C / micro-USB hole on the right side, level with the board's port
    translate([body[0] - wall - 1, wall + 7 + board[1] / 2 - 6, wall + 3 + usb_z - 4]) cube([wall + 2, 12, 8]);
    // tiny vent slots under the chin
    for (i = [-2:2]) translate([body[0] / 2 + i * 6 - 1, -1, 7]) cube([2, wall + 2, 8]);
  }
  // OLED pocket: corner ribs that hold the module PCB square behind the window
  translate([body[0] / 2, wall, oled_z - oled_win_up]) for (sx = [-1, 1], sz = [-1, 1])
    translate([sx * (oled_pcb[0] / 2 + tol + .8), 0, sz * (oled_pcb[1] / 2 + tol + .8)]) difference() {
      translate([-3, 0, -3]) cube([6, 3.2, 6]);
      translate([-3 - sx * 3.8, -.1, -3 - sz * 3.8]) cube([6, 3.4, 6]);
    }
  // floor rails the board rests on, pushed against the right wall so its USB-C port meets the hole
  for (y = [wall + 7, wall + 7 + board[1] + tol]) translate([body[0] - wall - board[0] - 1, y - 1.2, wall - .5]) cube([board[0], 1.2, 3.5]);
}

module back() {
  o = [body[0] - 2 * wall - 4 - 2 * tol, body[2] - 2 * wall - 4 - 2 * tol];
  difference() {
    union() {
      translate([-3, 0, -3]) cube([o[0] + 6, 1.6, o[1] + 6]);                 // flange
      translate([0, 1.6, 0]) difference() { cube([o[0], wall, o[1]]); translate([1.6, -.1, 1.6]) cube([o[0] - 3.2, wall + .2, o[1] - 3.2]); }   // plug rim
    }
    for (i = [0:4]) translate([o[0] / 2 - 16 + i * 8, -.1, o[1] - 14]) cube([3, 2, 10]);                // vents
    translate([o[0] / 2, -.1, 8]) rotate([-90, 0, 0]) cylinder(d = 5, h = 2);                              // spare wire hole
  }
}

if (part == "shell") shell();
if (part == "back") rotate([90, 0, 0]) back();
if (part == "fit") intersection() { shell(); translate([-1, -1, -1]) cube([body[0] + 2, wall + 3.5, body[2] + 20]); }
if (part == "all") { shell(); translate([wall + 2 + tol, body[1] + 12, wall + 2 + tol]) back(); }
