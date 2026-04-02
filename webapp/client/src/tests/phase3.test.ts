/**
 * Phase 3 — Turtle Graphics Tests
 *
 * Tests define the contracts for turtle command validation and canvas output
 * integration with the cell store.
 *
 * Store-level canvas output tests fail until CellModel.ts is updated to include
 * a 'canvas' output type.
 * parseTurtleCommand tests fail until src/utils/turtleCommands.ts is created.
 * handleWorkerMessage turtle tests fail until the turtle branch is added to
 * src/workers/workerMessageHandler.ts.
 *
 * Python-shim unit tests (pytest) live in tests/test_turtle_shim.py.
 * E2E (Playwright) canvas scenarios are listed in phase-3.md.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useCellStore } from '../stores/cellStore';
import { useKernelStore } from '../stores/kernelStore';

const CELL_ID = 'cell-1';

function resetStores() {
  useCellStore.setState({
    cells: {
      [CELL_ID]: {
        id: CELL_ID,
        source: 'import turtle\nturtle.forward(100)',
        outputs: [],
        executionCount: null,
        status: 'idle',
      },
    },
  });
  useKernelStore.setState({ status: 'idle', queue: [] });
}

beforeEach(resetStores);

// ---------------------------------------------------------------------------
// 1. CellStore — canvas output type
// Fails until CellModel.ts adds 'canvas' to the CellOutput type union and
// CellStore accepts canvas outputs from the worker.
// ---------------------------------------------------------------------------

describe('CellStore — canvas output', () => {
  it('addOutput with type canvas stores the commands list', () => {
    useCellStore.getState().addOutput(CELL_ID, {
      type: 'canvas',
      commands: [{ type: 'forward', distance: 100 }],
    });
    const outputs = useCellStore.getState().cells[CELL_ID].outputs;
    expect(outputs).toHaveLength(1);
    expect(outputs[0].type).toBe('canvas');
  });

  it('canvas output holds the full commands array', () => {
    const cmds = [
      { type: 'forward', distance: 100 },
      { type: 'right', angle: 90 },
      { type: 'forward', distance: 50 },
    ];
    useCellStore.getState().addOutput(CELL_ID, { type: 'canvas', commands: cmds });
    const output = useCellStore.getState().cells[CELL_ID].outputs[0];
    expect((output as { type: 'canvas'; commands: unknown[] }).commands).toHaveLength(3);
  });

  it('clearOutputs removes a canvas output', () => {
    useCellStore.getState().addOutput(CELL_ID, {
      type: 'canvas',
      commands: [{ type: 'clear' }],
    });
    useCellStore.getState().clearOutputs(CELL_ID);
    expect(useCellStore.getState().cells[CELL_ID].outputs).toHaveLength(0);
  });

  it('re-running clears the old canvas output before adding a new one', () => {
    useCellStore.getState().addOutput(CELL_ID, {
      type: 'canvas',
      commands: [{ type: 'forward', distance: 100 }],
    });
    useCellStore.getState().clearOutputs(CELL_ID);
    useCellStore.getState().addOutput(CELL_ID, {
      type: 'canvas',
      commands: [{ type: 'forward', distance: 200 }],
    });
    const outputs = useCellStore.getState().cells[CELL_ID].outputs;
    expect(outputs).toHaveLength(1);
    const cmds = (outputs[0] as { type: 'canvas'; commands: { distance: number }[] }).commands;
    expect(cmds[0].distance).toBe(200);
  });

  it('a cell with no turtle output has no canvas entry', () => {
    useCellStore.getState().addOutput(CELL_ID, { type: 'stdout', text: 'hello\n' });
    const outputs = useCellStore.getState().cells[CELL_ID].outputs;
    expect(outputs.every((o) => o.type !== 'canvas')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 2. parseTurtleCommand — command object validation
// Fails until src/utils/turtleCommands.ts is created.
// ---------------------------------------------------------------------------

import { parseTurtleCommand } from '../utils/turtleCommands';

describe('parseTurtleCommand — movement commands', () => {
  it('parses a forward command with distance', () => {
    const cmd = parseTurtleCommand({ type: 'forward', distance: 100 });
    expect(cmd).toEqual({ type: 'forward', distance: 100 });
  });

  it('parses a backward command with distance', () => {
    const cmd = parseTurtleCommand({ type: 'backward', distance: 50 });
    expect(cmd).toEqual({ type: 'backward', distance: 50 });
  });

  it('parses a right turn with angle', () => {
    const cmd = parseTurtleCommand({ type: 'right', angle: 90 });
    expect(cmd).toEqual({ type: 'right', angle: 90 });
  });

  it('parses a left turn with angle', () => {
    const cmd = parseTurtleCommand({ type: 'left', angle: 45 });
    expect(cmd).toEqual({ type: 'left', angle: 45 });
  });

  it('parses goto with x and y coordinates', () => {
    const cmd = parseTurtleCommand({ type: 'goto', x: 10, y: 20 });
    expect(cmd).toEqual({ type: 'goto', x: 10, y: 20 });
  });
});

describe('parseTurtleCommand — pen commands', () => {
  it('parses penup', () => {
    expect(parseTurtleCommand({ type: 'penup' })).toEqual({ type: 'penup' });
  });

  it('parses pendown', () => {
    expect(parseTurtleCommand({ type: 'pendown' })).toEqual({ type: 'pendown' });
  });

  it('parses pencolor with a named color', () => {
    expect(parseTurtleCommand({ type: 'pencolor', color: 'red' })).toEqual({
      type: 'pencolor',
      color: 'red',
    });
  });

  it('parses pensize with a width', () => {
    expect(parseTurtleCommand({ type: 'pensize', width: 3 })).toEqual({
      type: 'pensize',
      width: 3,
    });
  });
});

describe('parseTurtleCommand — drawing commands', () => {
  it('parses circle with radius', () => {
    expect(parseTurtleCommand({ type: 'circle', radius: 50 })).toEqual({
      type: 'circle',
      radius: 50,
    });
  });

  it('parses home', () => {
    expect(parseTurtleCommand({ type: 'home' })).toEqual({ type: 'home' });
  });

  it('parses clear', () => {
    expect(parseTurtleCommand({ type: 'clear' })).toEqual({ type: 'clear' });
  });

  it('parses reset', () => {
    expect(parseTurtleCommand({ type: 'reset' })).toEqual({ type: 'reset' });
  });

  it('parses speed with a speed value', () => {
    expect(parseTurtleCommand({ type: 'speed', speed: 5 })).toEqual({
      type: 'speed',
      speed: 5,
    });
  });

  it('parses hideturtle', () => {
    expect(parseTurtleCommand({ type: 'hideturtle' })).toEqual({ type: 'hideturtle' });
  });

  it('parses showturtle', () => {
    expect(parseTurtleCommand({ type: 'showturtle' })).toEqual({ type: 'showturtle' });
  });
});

describe('parseTurtleCommand — unknown commands', () => {
  it('returns null for an unrecognized command type', () => {
    expect(parseTurtleCommand({ type: 'fly', speed: 9 })).toBeNull();
  });

  it('returns null for a missing type field', () => {
    expect(parseTurtleCommand({})).toBeNull();
  });

  it('returns null for a non-object input', () => {
    expect(parseTurtleCommand(null)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 3. handleWorkerMessage — turtle message branch
// Fails until the 'turtle' case is added to workerMessageHandler.ts.
// ---------------------------------------------------------------------------

import { handleWorkerMessage } from '../workers/workerMessageHandler';

describe('handleWorkerMessage — turtle message', () => {
  beforeEach(resetStores);

  it('turtle message adds a canvas output to the cell', () => {
    const commands = [{ type: 'forward', distance: 100 }];
    handleWorkerMessage({ type: 'turtle', cellId: CELL_ID, commands });
    const outputs = useCellStore.getState().cells[CELL_ID].outputs;
    expect(outputs.some((o) => o.type === 'canvas')).toBe(true);
  });

  it('canvas output contains the commands from the turtle message', () => {
    const commands = [
      { type: 'forward', distance: 100 },
      { type: 'right', angle: 90 },
    ];
    handleWorkerMessage({ type: 'turtle', cellId: CELL_ID, commands });
    const canvasOutput = useCellStore
      .getState()
      .cells[CELL_ID].outputs.find((o) => o.type === 'canvas') as
      | { type: 'canvas'; commands: unknown[] }
      | undefined;
    expect(canvasOutput?.commands).toHaveLength(2);
  });

  it('turtle message for an unknown cell is silently ignored', () => {
    expect(() => {
      handleWorkerMessage({ type: 'turtle', cellId: 'ghost', commands: [] });
    }).not.toThrow();
  });

  it('a second turtle message replaces the first canvas output', () => {
    handleWorkerMessage({
      type: 'turtle',
      cellId: CELL_ID,
      commands: [{ type: 'forward', distance: 100 }],
    });
    handleWorkerMessage({
      type: 'turtle',
      cellId: CELL_ID,
      commands: [{ type: 'forward', distance: 200 }],
    });
    const outputs = useCellStore.getState().cells[CELL_ID].outputs;
    const canvasOutputs = outputs.filter((o) => o.type === 'canvas');
    expect(canvasOutputs).toHaveLength(1);
    const cmds = (canvasOutputs[0] as { type: 'canvas'; commands: { distance: number }[] })
      .commands;
    expect(cmds[0].distance).toBe(200);
  });
});