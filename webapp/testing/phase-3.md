# Phase 3 Testing — Turtle Graphics

**Tool**: pytest (Python shim unit tests), Playwright (E2E)

## Goals
Verify the turtle shim emits correct command objects and that the canvas renders in the cell output.

## turtle_shim.py — unit tests (pytest)
Mock `postMessage` and assert each API call produces the expected command dict.

| Call | Expected command |
|---|---|
| `turtle.forward(100)` | `{ "type": "forward", "distance": 100 }` |
| `turtle.backward(50)` | `{ "type": "backward", "distance": 50 }` |
| `turtle.right(90)` | `{ "type": "right", "angle": 90 }` |
| `turtle.left(45)` | `{ "type": "left", "angle": 45 }` |
| `turtle.penup()` | `{ "type": "penup" }` |
| `turtle.pendown()` | `{ "type": "pendown" }` |
| `turtle.pencolor("red")` | `{ "type": "pencolor", "color": "red" }` |
| `turtle.pensize(3)` | `{ "type": "pensize", "width": 3 }` |
| `turtle.goto(10, 20)` | `{ "type": "goto", "x": 10, "y": 20 }` |
| `turtle.home()` | `{ "type": "home" }` |
| `turtle.circle(50)` | `{ "type": "circle", "radius": 50 }` |
| `turtle.clear()` | `{ "type": "clear" }` |
| `turtle.reset()` | `{ "type": "reset" }` |
| `turtle.speed(5)` | `{ "type": "speed", "speed": 5 }` |
| `turtle.hideturtle()` | `{ "type": "hideturtle" }` |
| `turtle.showturtle()` | `{ "type": "showturtle" }` |

- `mainloop()` and `done()` are no-ops (no command emitted, no exception)
- Commands are batched: multiple calls flush as a single list, not per-call postMessages

## E2E — Canvas in browser (Playwright)
- A cell containing turtle draw commands produces a `<canvas>` element in its output area
- The canvas is absent when the cell contains no turtle commands
- Re-running a turtle cell replaces the old canvas with a fresh one
- Canvas dimensions are 600×400 px
