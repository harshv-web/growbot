// Tablet camera, hub side. Used only when you ask ("what do you see?") and the face isn't open.
// The face page does the always-on part (presence, light, gaze) inside the browser; no frames leave the tablet.
// Fire 7 (2017, "austin"): camera 0 = rear 2 MP, camera 1 = front VGA. Needs Termux:API + camera permission.
import { execFile } from "node:child_process";
import { readFileSync, unlinkSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const run = (cmd, args, ms = 15000) => new Promise((res, rej) => execFile(cmd, args, { timeout: ms }, (e, out) => e ? rej(e) : res(out)));

export async function snap(cfg) {
  const c = cfg.camera || {};
  if (c.hubSnap === false) throw new Error("hub camera off in config");
  const file = join(tmpdir(), `jeevo-look-${Date.now()}.jpg`);
  await run("termux-camera-photo", ["-c", String(c.cameraId ?? 1), file]);
  if (!existsSync(file)) throw new Error("no photo");
  const b64 = readFileSync(file).toString("base64");
  unlinkSync(file);                  // nothing kept on disk
  return b64;
}
