"""
Phase 3 — Turtle Shim Unit Tests (pytest)

Tests the turtle_shim module in isolation, verifying that each public API call
emits the correct command dict and that commands are batched into a single
postMessage call rather than one per invocation.

All tests fail until webapp/client/public/turtle_shim.py (or the equivalent
shim path) is created and made importable as `turtle_shim`.

Run with:
    pytest tests/test_turtle_shim.py
"""

import sys
import types
import pytest
from unittest.mock import MagicMock, patch


# ---------------------------------------------------------------------------
# Fixture — fresh shim with a mocked JS bridge
# ---------------------------------------------------------------------------

@pytest.fixture
def turtle(monkeypatch):
    """
    Yield (shim_module, mock_post_message).

    A fake `js` module is injected so turtle_shim can call js.postMessage
    without a real browser/Pyodide environment.  The shim is re-imported
    fresh for every test so internal state does not leak between tests.
    """
    sys.modules.pop("turtle_shim", None)

    mock_post = MagicMock()
    fake_js = types.ModuleType("js")
    fake_js.postMessage = mock_post
    monkeypatch.setitem(sys.modules, "js", fake_js)

    import turtle_shim  # noqa: PLC0415 — intentional deferred import

    turtle_shim._reset()
    return turtle_shim, mock_post


def _flushed_commands(shim, post):
    """Flush the shim's command buffer and return the emitted command list."""
    shim._flush()
    assert post.call_count == 1, "Expected exactly one postMessage call after flush"
    return post.call_args[0][0]


# ---------------------------------------------------------------------------
# 1. Movement commands
# ---------------------------------------------------------------------------

class TestMovementCommands:
    def test_forward(self, turtle):
        shim, post = turtle
        shim.forward(100)
        cmds = _flushed_commands(shim, post)
        assert {"type": "forward", "distance": 100} in cmds

    def test_backward(self, turtle):
        shim, post = turtle
        shim.backward(50)
        cmds = _flushed_commands(shim, post)
        assert {"type": "backward", "distance": 50} in cmds

    def test_right(self, turtle):
        shim, post = turtle
        shim.right(90)
        cmds = _flushed_commands(shim, post)
        assert {"type": "right", "angle": 90} in cmds

    def test_left(self, turtle):
        shim, post = turtle
        shim.left(45)
        cmds = _flushed_commands(shim, post)
        assert {"type": "left", "angle": 45} in cmds

    def test_goto(self, turtle):
        shim, post = turtle
        shim.goto(10, 20)
        cmds = _flushed_commands(shim, post)
        assert {"type": "goto", "x": 10, "y": 20} in cmds

    def test_home(self, turtle):
        shim, post = turtle
        shim.home()
        cmds = _flushed_commands(shim, post)
        assert {"type": "home"} in cmds


# ---------------------------------------------------------------------------
# 2. Pen commands
# ---------------------------------------------------------------------------

class TestPenCommands:
    def test_penup(self, turtle):
        shim, post = turtle
        shim.penup()
        cmds = _flushed_commands(shim, post)
        assert {"type": "penup"} in cmds

    def test_pendown(self, turtle):
        shim, post = turtle
        shim.pendown()
        cmds = _flushed_commands(shim, post)
        assert {"type": "pendown"} in cmds

    def test_pencolor_named(self, turtle):
        shim, post = turtle
        shim.pencolor("red")
        cmds = _flushed_commands(shim, post)
        assert {"type": "pencolor", "color": "red"} in cmds

    def test_pencolor_hex(self, turtle):
        shim, post = turtle
        shim.pencolor("#ff0000")
        cmds = _flushed_commands(shim, post)
        assert {"type": "pencolor", "color": "#ff0000"} in cmds

    def test_pensize(self, turtle):
        shim, post = turtle
        shim.pensize(3)
        cmds = _flushed_commands(shim, post)
        assert {"type": "pensize", "width": 3} in cmds


# ---------------------------------------------------------------------------
# 3. Drawing commands
# ---------------------------------------------------------------------------

class TestDrawingCommands:
    def test_circle(self, turtle):
        shim, post = turtle
        shim.circle(50)
        cmds = _flushed_commands(shim, post)
        assert {"type": "circle", "radius": 50} in cmds

    def test_clear(self, turtle):
        shim, post = turtle
        shim.clear()
        cmds = _flushed_commands(shim, post)
        assert {"type": "clear"} in cmds

    def test_reset(self, turtle):
        shim, post = turtle
        shim.reset()
        cmds = _flushed_commands(shim, post)
        assert {"type": "reset"} in cmds

    def test_speed(self, turtle):
        shim, post = turtle
        shim.speed(5)
        cmds = _flushed_commands(shim, post)
        assert {"type": "speed", "speed": 5} in cmds

    def test_hideturtle(self, turtle):
        shim, post = turtle
        shim.hideturtle()
        cmds = _flushed_commands(shim, post)
        assert {"type": "hideturtle"} in cmds

    def test_showturtle(self, turtle):
        shim, post = turtle
        shim.showturtle()
        cmds = _flushed_commands(shim, post)
        assert {"type": "showturtle"} in cmds


# ---------------------------------------------------------------------------
# 4. No-op commands — mainloop and done must not emit any command or raise
# ---------------------------------------------------------------------------

class TestNoOps:
    def test_mainloop_does_not_emit_command(self, turtle):
        shim, post = turtle
        shim.mainloop()
        shim._flush()
        cmds = post.call_args[0][0] if post.call_count else []
        assert not any(c.get("type") == "mainloop" for c in cmds)

    def test_done_does_not_emit_command(self, turtle):
        shim, post = turtle
        shim.done()
        shim._flush()
        cmds = post.call_args[0][0] if post.call_count else []
        assert not any(c.get("type") == "done" for c in cmds)

    def test_mainloop_does_not_raise(self, turtle):
        shim, _ = turtle
        shim.mainloop()  # must not raise

    def test_done_does_not_raise(self, turtle):
        shim, _ = turtle
        shim.done()  # must not raise


# ---------------------------------------------------------------------------
# 5. Batching — all commands from one execution flush as a single postMessage
# ---------------------------------------------------------------------------

class TestBatching:
    def test_multiple_calls_produce_single_post_message(self, turtle):
        shim, post = turtle
        shim.forward(100)
        shim.right(90)
        shim.forward(50)
        shim._flush()
        assert post.call_count == 1

    def test_batch_preserves_insertion_order(self, turtle):
        shim, post = turtle
        shim.forward(100)
        shim.right(90)
        shim.forward(50)
        shim._flush()
        cmds = post.call_args[0][0]
        types_in_order = [c["type"] for c in cmds]
        assert types_in_order == ["forward", "right", "forward"]

    def test_batch_contains_all_commands(self, turtle):
        shim, post = turtle
        shim.penup()
        shim.goto(10, 20)
        shim.pendown()
        shim.circle(30)
        shim._flush()
        cmds = post.call_args[0][0]
        assert len(cmds) == 4

    def test_empty_flush_sends_empty_list(self, turtle):
        shim, post = turtle
        shim._flush()
        cmds = post.call_args[0][0]
        assert cmds == []

    def test_reset_clears_buffer_so_second_flush_is_empty(self, turtle):
        shim, post = turtle
        shim.forward(100)
        shim._flush()
        post.reset_mock()
        shim._flush()
        cmds = post.call_args[0][0]
        assert cmds == []

    def test_mainloop_does_not_add_to_batch(self, turtle):
        shim, post = turtle
        shim.forward(100)
        shim.mainloop()
        shim._flush()
        cmds = post.call_args[0][0]
        assert len(cmds) == 1

    def test_done_does_not_add_to_batch(self, turtle):
        shim, post = turtle
        shim.forward(100)
        shim.done()
        shim._flush()
        cmds = post.call_args[0][0]
        assert len(cmds) == 1