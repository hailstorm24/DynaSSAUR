"""
turtle_shim.py — Browser-compatible turtle graphics shim for Pyodide.

Buffers turtle commands in _commands and flushes them as a single
postMessage call. Registered as sys.modules['turtle'] in the worker so
user code can write `import turtle; turtle.forward(100)` unchanged.

Internal API (used by the worker and tests):
  _reset()   — clear the command buffer
  _flush()   — call js.postMessage(_commands) then clear the buffer
"""

import sys as _sys

_commands = []


def _reset():
    global _commands
    _commands = []


def _flush():
    import js as _js
    _js.postMessage(list(_commands))
    _reset()


# ---------------------------------------------------------------------------
# Movement
# ---------------------------------------------------------------------------

def forward(distance):
    _commands.append({"type": "forward", "distance": distance})


def backward(distance):
    _commands.append({"type": "backward", "distance": distance})


def right(angle):
    _commands.append({"type": "right", "angle": angle})


def left(angle):
    _commands.append({"type": "left", "angle": angle})


def goto(x, y):
    _commands.append({"type": "goto", "x": x, "y": y})


def home():
    _commands.append({"type": "home"})


# ---------------------------------------------------------------------------
# Pen
# ---------------------------------------------------------------------------

def penup():
    _commands.append({"type": "penup"})


def pendown():
    _commands.append({"type": "pendown"})


def pencolor(color):
    _commands.append({"type": "pencolor", "color": color})


def pensize(width):
    _commands.append({"type": "pensize", "width": width})


# ---------------------------------------------------------------------------
# Drawing
# ---------------------------------------------------------------------------

def circle(radius):
    _commands.append({"type": "circle", "radius": radius})


def clear():
    _commands.append({"type": "clear"})


def reset():
    _commands.append({"type": "reset"})


def speed(speed):
    _commands.append({"type": "speed", "speed": speed})


def hideturtle():
    _commands.append({"type": "hideturtle"})


def showturtle():
    _commands.append({"type": "showturtle"})


# ---------------------------------------------------------------------------
# No-ops (required by common turtle programs; no command emitted)
# ---------------------------------------------------------------------------

def mainloop():
    pass


def done():
    pass
