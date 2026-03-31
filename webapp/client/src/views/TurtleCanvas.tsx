import { useRef } from 'react';

export function TurtleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
        width={400}
        height={400}
        style={{ display: 'block' }}
        aria-label="Turtle graphics canvas"
      />
    </div>
  );
}
