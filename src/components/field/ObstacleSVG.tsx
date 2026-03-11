import { Obstacle, OBSTACLE_DEFINITIONS, FIELD_WIDTH_M, FIELD_HEIGHT_M } from '@/types/fieldLayout';

interface ObstacleSVGProps {
  obstacle: Obstacle;
  fieldWidth: number;
  fieldHeight: number;
  selected?: boolean;
  onPointerDown?: (e: React.PointerEvent, id: string) => void;
  interactive?: boolean;
}

function m2px(metres: number, axisPx: number, axisM: number): number {
  return (metres / axisM) * axisPx;
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

  const x = (obstacle.x / 100) * fieldWidth;
  const y = (obstacle.y / 100) * fieldHeight;
  const w = m2px(def.widthM, fieldWidth, FIELD_WIDTH_M);
  const d = m2px(def.depthM, fieldHeight, FIELD_HEIGHT_M);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (interactive && onPointerDown) {
      e.stopPropagation();
      onPointerDown(e, obstacle.id);
    }
  };

  const cursor = interactive ? 'grab' : 'default';
  const outlineStroke = selected ? '#ffd966' : '#1a1a1a';
  const outlineWidth = selected ? 2.5 : 1.2;

  return (
    <g
      transform={`translate(${x}, ${y}) rotate(${obstacle.rotation})`}
      onPointerDown={handlePointerDown}
      style={{ cursor }}
    >
      {/* NXL-style shape rendering */}
      {def.birdEye === 'circle' && (
        <circle r={w / 2} fill={def.color} stroke={outlineStroke} strokeWidth={outlineWidth} />
      )}

      {def.birdEye === 'triangle' && (
        <polygon
          points={`0,${-d / 2} ${w / 2},${d / 2} ${-w / 2},${d / 2}`}
          fill="#1a1a1a"
          stroke={outlineStroke}
          strokeWidth={outlineWidth}
          strokeLinejoin="miter"
        />
      )}

      {def.birdEye === 'rect' && (
        <rect x={-w / 2} y={-d / 2} width={w} height={d}
          fill={def.color} stroke={outlineStroke} strokeWidth={outlineWidth} />
      )}

      {def.birdEye === 'capsule' && (
        <rect x={-w / 2} y={-d / 2} width={w} height={d}
          rx={Math.min(w, d) * 0.15}
          fill={def.color} stroke={outlineStroke} strokeWidth={outlineWidth} />
      )}

      {def.birdEye === 'stepped-rect' && (
        <g>
          {/* Outer base */}
          <rect x={-w / 2} y={-d / 2} width={w} height={d}
            fill={def.color} stroke={outlineStroke} strokeWidth={outlineWidth} />
          {/* Inner step */}
          <rect x={-w * 0.3} y={-d * 0.3} width={w * 0.6} height={d * 0.6}
            fill={def.colorSecondary} stroke={outlineStroke} strokeWidth={0.8} />
        </g>
      )}

      {def.birdEye === 'plus' && (
        <g>
          {/* NXL Giant Plus — cross/plus shape */}
          <polygon
            points={`${-w * 0.17},${-d / 2} ${w * 0.17},${-d / 2} ${w * 0.17},${-d * 0.17} ${w / 2},${-d * 0.17} ${w / 2},${d * 0.17} ${w * 0.17},${d * 0.17} ${w * 0.17},${d / 2} ${-w * 0.17},${d / 2} ${-w * 0.17},${d * 0.17} ${-w / 2},${d * 0.17} ${-w / 2},${-d * 0.17} ${-w * 0.17},${-d * 0.17}`}
            fill={def.color}
            stroke={outlineStroke}
            strokeWidth={outlineWidth}
            strokeLinejoin="miter"
          />
        </g>
      )}

      {/* Selection ring */}
      {selected && (
        <circle r={Math.max(w, d) / 2 + 4}
          fill="none" stroke="#ffd966" strokeWidth={1.5}
          strokeDasharray="4,3" opacity={0.7} />
      )}
    </g>
  );
}
