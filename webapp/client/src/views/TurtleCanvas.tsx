import { useRef, useEffect } from 'react';

interface TurtleCanvasProps {
  commands: unknown[];
}

type Cmd = Record<string, unknown>;

function renderTurtle(canvas: HTMLCanvasElement, commands: unknown[]) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const W = canvas.width;
  const H = canvas.height;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, W, H);

  // Turtle coordinate system: origin at center, +y is up
  let x = 0, y = 0;
  let angle = 90; // degrees, measured CCW from +x axis; 90 = facing up
  let penDown = true;
  let color = '#000';
  let lineWidth = 1;

  function toCanvas(tx: number, ty: number): [number, number] {
    return [W / 2 + tx, H / 2 - ty];
  }

  function moveTo(nx: number, ny: number) {
    const [cx, cy] = toCanvas(nx, ny);
    if (penDown) {
      ctx!.strokeStyle = color;
      ctx!.lineWidth = lineWidth;
      ctx!.beginPath();
      ctx!.moveTo(...toCanvas(x, y));
      ctx!.lineTo(cx, cy);
      ctx!.stroke();
    }
    x = nx;
    y = ny;
  }

  for (const rawCmd of commands) {
    if (!rawCmd || typeof rawCmd !== 'object') continue;
    const cmd = rawCmd as Cmd;

    switch (cmd.type) {
      case 'forward': {
        const dist = cmd.distance as number;
        const rad = (angle * Math.PI) / 180;
        moveTo(x + dist * Math.cos(rad), y + dist * Math.sin(rad));
        break;
      }
      case 'backward': {
        const dist = cmd.distance as number;
        const rad = (angle * Math.PI) / 180;
        moveTo(x - dist * Math.cos(rad), y - dist * Math.sin(rad));
        break;
      }
      case 'right':
        angle -= cmd.angle as number;
        break;
      case 'left':
        angle += cmd.angle as number;
        break;
      case 'goto':
        moveTo(cmd.x as number, cmd.y as number);
        break;
      case 'home':
        moveTo(0, 0);
        angle = 90;
        break;
      case 'penup':
        penDown = false;
        break;
      case 'pendown':
        penDown = true;
        break;
      case 'pencolor':
        color = cmd.color as string;
        break;
      case 'pensize':
        lineWidth = cmd.width as number;
        break;
      case 'circle': {
        const r = cmd.radius as number;
        const [cx, cy] = toCanvas(x, y - r);
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, 2 * Math.PI);
        if (penDown) ctx.stroke();
        break;
      }
      case 'clear':
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, W, H);
        break;
      case 'reset':
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, W, H);
        x = 0; y = 0; angle = 90;
        penDown = true; color = '#000'; lineWidth = 1;
        break;
      case 'speed':
      case 'hideturtle':
      case 'showturtle':
        break;
    }
  }
}

export function TurtleCanvas({ commands }: TurtleCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      renderTurtle(canvasRef.current, commands);
    }
  }, [commands]);

  return (
    <div
      style={{
        border: '1px solid #444',
        borderRadius: '4px',
        overflow: 'hidden',
        display: 'inline-block',
        background: '#fff',
      }}
    >
      <canvas
        ref={canvasRef}
        width={600}
        height={400}
        style={{ display: 'block' }}
        aria-label="Turtle graphics canvas"
      />
    </div>
  );
}
