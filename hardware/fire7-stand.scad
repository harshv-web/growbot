// Stand for the Fire 7 (7th gen, 2017, "austin"): 192 x 115 x 9.6 mm. Holds it landscape, leaning back,
// with the front camera clear and an open back so the always-plugged battery stays cool.
// Print on its side? No: print it as modelled (base down), 0.2 mm layers, 15–20% infill, no supports.
$fn = 48;
tab_t  = 9.6;        // tablet thickness (add your case, if any)
tol    = 1.2;
lean   = 16;         // degrees back from vertical
width  = 120;        // stand width (the tablet is 192 wide in landscape; its centre sits here)
base   = [width, 78, 5];
lip_h  = 7;          // front lip: only covers the bezel
back_h = 70;         // height of the back support
cable  = true;       // slot for a USB cable to pass under the tablet

slot = (tab_t + tol) / cos(lean);
lip_y = 8;
module rounded(s, r = 3) { hull() for (x = [r, s[0] - r], y = [r, s[1] - r]) translate([x, y, 0]) cylinder(r = r, h = s[2]); }

difference() {
  union() {
    rounded(base);
    translate([0, lip_y, 0]) rounded([width, 4, base[2] + lip_h], 1.5);                       // front lip
    // back support: a leaning slab with a brace to the base
    translate([0, lip_y + 4 + slot, 0]) intersection() {
      hull() {
        rotate([-lean, 0, 0]) cube([width, 5, back_h]);
        translate([0, 40, 0]) cube([width, 1, base[2]]);
      }
      translate([0, -50, 0]) cube([width, 200, 200]);
    }
  }
  // lighten + cool: a big window through the brace
  translate([width * .2, lip_y + 4 + slot, base[2] + 6]) rotate([-lean, 0, 0]) translate([0, -1, 0]) rounded([width * .6, 62, back_h - 24], 8);
  translate([width * .2, lip_y + 4 + slot + 6, -1]) rounded([width * .6, 30, base[2] + 2], 6);
  // cable slot
  if (cable) translate([width / 2 - 8, -1, base[2] - 2]) cube([16, lip_y + 4 + slot + 2, 3]);
}
