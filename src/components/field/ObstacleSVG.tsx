import { Obstacle, OBSTACLE_DEFINITIONS } from '@/types/fieldLayout';

interface ObstacleSVGProps {
  obstacle: Obstacle;
  fieldWidth: number;
  fieldHeight: number;
  selected?: boolean;
  onPointerDown?: (e: React.PointerEvent, id: string) => void;
  interactive?: boolean;
}

export function ObstacleSVG({
  obstacle,
  fieldWidth,
  fieldHeight,
  selected,
  onPointerDown,
  interactive = false,
}: ObstacleSVGProps) {
  const def = OBSTACLE_DEFINITIONS[obstacle.type];
  const scale = Math.min(fieldWidth, fieldHeight) / 100;
  const x = (obstacle.x / 100) * fieldWidth;
  const y = (obstacle.y / 100) * fieldHeight;
  const w = def.width * scale;
  const h = def.height * scale;

  const handlePointerDown = (e: React.PointerEvent) => {
    if (interactive && onPointerDown) {
      e.stopPropagation();
      onPointerDown(e, obstacle.id);
    }
  };

  const cursor = interactive ? 'grab' : 'default';
  const strokeColor = selected ? 'hsl(45, 100%, 70%)' : 'rgba(0,0,0,0.4)';
  const strokeWidth = selected ? 2 : 1;

  return (
    <g
      transform={`translate(${x}, ${y}) rotate(${obstacle.rotation})`}
      onPointerDown={handlePointerDown}
      style={{ cursor }}
    >
      {def.shape === 'rect' && (
        <rect
          x={-w / 2}
          y={-h / 2}
          width={w}
          height={h}
          rx={scale * 0.3}
          fill={def.color}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          opacity={0.9}
        />
      )}
      {def.shape === 'cylinder' && (
        <>
          <ellipse
            cx={0}
            cy={0}
            rx={w / 2}
            ry={h / 2}
            fill={def.color}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            opacity={0.9}
          />
          <ellipse
            cx={0}
            cy={0}
            rx={w / 2 - scale * 0.5}
            ry={h / 2 - scale * 0.5}
            fill="none"
            stroke="rgba(255,255,255,0.2)"
            strokeWidth={0.5}
          />
        </>
      )}
      {def.shape === 'triangle' && (
        <polygon
          points={`0,${-h / 2} ${w / 2},${h / 2} ${-w / 2},${h / 2}`}
          fill={def.color}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          opacity={0.9}
        />
      )}
      {selected && (
        <circle
          cx={0}
          cy={0}
          r={Math.max(w, h) / 2 + scale * 0.8}
          fill="none"
          stroke="hsl(45, 100%, 70%)"
          strokeWidth={1}
          strokeDasharray="3,3"
          opacity={0.6}
        />
      )}
    </g>
  );
}
