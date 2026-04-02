export type TurtleCommand =
  | { type: 'forward'; distance: number }
  | { type: 'backward'; distance: number }
  | { type: 'right'; angle: number }
  | { type: 'left'; angle: number }
  | { type: 'goto'; x: number; y: number }
  | { type: 'penup' }
  | { type: 'pendown' }
  | { type: 'pencolor'; color: string }
  | { type: 'pensize'; width: number }
  | { type: 'circle'; radius: number }
  | { type: 'home' }
  | { type: 'clear' }
  | { type: 'reset' }
  | { type: 'speed'; speed: number }
  | { type: 'hideturtle' }
  | { type: 'showturtle' };

export function parseTurtleCommand(raw: unknown): TurtleCommand | null {
  if (!raw || typeof raw !== 'object') return null;
  const cmd = raw as Record<string, unknown>;
  switch (cmd.type) {
    case 'forward':    return { type: 'forward',    distance: cmd.distance as number };
    case 'backward':   return { type: 'backward',   distance: cmd.distance as number };
    case 'right':      return { type: 'right',      angle: cmd.angle as number };
    case 'left':       return { type: 'left',       angle: cmd.angle as number };
    case 'goto':       return { type: 'goto',       x: cmd.x as number, y: cmd.y as number };
    case 'penup':      return { type: 'penup' };
    case 'pendown':    return { type: 'pendown' };
    case 'pencolor':   return { type: 'pencolor',   color: cmd.color as string };
    case 'pensize':    return { type: 'pensize',    width: cmd.width as number };
    case 'circle':     return { type: 'circle',     radius: cmd.radius as number };
    case 'home':       return { type: 'home' };
    case 'clear':      return { type: 'clear' };
    case 'reset':      return { type: 'reset' };
    case 'speed':      return { type: 'speed',      speed: cmd.speed as number };
    case 'hideturtle': return { type: 'hideturtle' };
    case 'showturtle': return { type: 'showturtle' };
    default:           return null;
  }
}
