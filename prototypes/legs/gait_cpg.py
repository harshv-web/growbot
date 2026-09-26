# Jeevo legs firmware prototype — Raspberry Pi Pico 2 W, MicroPython.
# Two-leg rhythm generator (CPG) that the phone/tablet tunes online.
# Speaks a superset of GrowBot's body contract over USB serial or Wi-Fi:
#   hello, pose "l,r", act [{l,r,ms}], routine, stop   (GrowBot)
#   gait {amp,freq,phase,bias,on}                      (Jeevo: rhythm params)
#   body?                                              (Jeevo: returns body truth)
# Untested sketch: check pins, trims and servo limits on your build first.
import sys, math, time, json, select
from machine import Pin, PWM

BODY = {  # body truth — edit per build (Walker: iPhone, Strider: Fire 7)
    "name": "strider", "channels": [{"id": "l", "pin": 0}, {"id": "r", "pin": 1}],
    "servo": "MG996R", "range": [20, 160], "neutral": 90, "mirrored": True,
    "legLengthMm": 110, "massG": 580, "sensors": [], "host": "fire7"
}
LO, HI = BODY["range"]
DEADMAN_MS = 500

def servo(pin):
    p = PWM(Pin(pin)); p.freq(50); return p

def write(p, deg):
    deg = max(LO, min(HI, deg))
    us = 500 + deg / 180 * 2000
    p.duty_u16(int(us / 20000 * 65535))

L, R = servo(0), servo(1)
state = {"mode": "hold", "l": 90, "r": 90, "keys": [], "gait": {"amp": 20, "freq": 1.0, "phase": 1.8, "bias": 0, "on": False}}
last_msg = time.ticks_ms()

def angles_at(t):
    g = state["gait"]
    w = 2 * math.pi * g["freq"] * t
    # mirrored legs: moving both "forward" means l + r = 180
    l = 90 - g["bias"] + g["amp"] * math.sin(w)
    r = 90 + g["bias"] + g["amp"] * math.sin(w + g["phase"])
    return l, r

def handle(msg):
    global last_msg
    last_msg = time.ticks_ms()
    t = msg.get("t")
    if t == "hello": return {"t": "hello", "body": BODY}
    if t == "body?": return {"t": "body", "body": BODY}
    if t == "pose":
        l, r = [float(x) for x in str(msg["v"]).split(",")]
        state.update(mode="pose", l=l, r=r); state["gait"]["on"] = False
    elif t == "act":
        state["keys"] = list(msg.get("keys", [])); state["mode"] = "act"; state["gait"]["on"] = False
    elif t == "gait":
        state["gait"].update({k: float(msg[k]) for k in ("amp", "freq", "phase", "bias") if k in msg})
        state["gait"]["on"] = bool(msg.get("on", True)); state["mode"] = "gait"
    elif t == "stop":
        state.update(mode="limp"); state["gait"]["on"] = False
    return {"t": "ack", "of": t}

def read_line():
    if select.select([sys.stdin], [], [], 0)[0]:
        line = sys.stdin.readline()
        if line: return line
    return None

t0 = time.ticks_ms(); key_t = t0
print(json.dumps({"t": "hello", "body": BODY}))
while True:
    line = read_line()
    if line:
        try: print(json.dumps(handle(json.loads(line))))
        except Exception as e: print(json.dumps({"t": "err", "e": str(e)}))
    now = time.ticks_ms()
    if time.ticks_diff(now, last_msg) > DEADMAN_MS and state["mode"] in ("gait", "act"):
        state["mode"] = "limp"; state["gait"]["on"] = False       # host went quiet: stop
    if state["mode"] == "gait" and state["gait"]["on"]:
        l, r = angles_at(time.ticks_diff(now, t0) / 1000)
    elif state["mode"] == "act" and state["keys"]:
        k = state["keys"][0]
        if time.ticks_diff(now, key_t) >= k.get("ms", 300):
            state["keys"].pop(0); key_t = now
        l, r = k["l"], k["r"]
    elif state["mode"] == "pose":
        l, r = state["l"], state["r"]
    else:
        l = r = None
    if l is None:
        L.duty_u16(0); R.duty_u16(0)                                 # limp
    else:
        write(L, l); write(R, r)
    time.sleep_ms(20)                                                # 50 Hz
