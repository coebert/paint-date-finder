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
  const selStroke = selected ? '#ffd966' : 'rgba(0,0,0,0.5)';
  const selWidth = selected ? 2.5 : 1;
  const shadow = Math.min(w, d) * 0.1;

  return (
    <g
      transform={`translate(${x}, ${y}) rotate(${obstacle.rotation})`}
      onPointerDown={handlePointerDown}
      style={{ cursor }}
    >
      {/* Shadow */}
      <ShadowShape birdEye={def.birdEye} w={w} d={d} offset={shadow} />

      {/* Main shape */}
      {def.birdEye === 'circle' && (
        <g>
          {/* Outer circle */}
          <circle r={w / 2} fill={def.color} stroke={selStroke} strokeWidth={selWidth} opacity={0.92} />
          {/* Inflatable tube ring detail */}
          <circle r={w * 0.38} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={0.8} />
          <circle r={w * 0.15} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={0.5} />
          {/* Top highlight */}
          <ellipse cx={-w * 0.1} cy={-w * 0.1} rx={w * 0.18} ry={w * 0.12}
            fill="rgba(255,255,255,0.12)" transform={`rotate(-30)`} />
        </g>
      )}

      {def.birdEye === 'triangle' && (
        <g>
          {/* Equilateral triangle footprint */}
          <polygon
            points={`0,${-d / 2} ${w / 2},${d / 2} ${-w / 2},${d / 2}`}
            fill={def.color} stroke={selStroke} strokeWidth={selWidth} opacity={0.92}
          />
          {/* Inner inflatable seam lines */}
          <polygon
            points={`0,${-d * 0.3} ${w * 0.3},${d * 0.3} ${-w * 0.3},${d * 0.3}`}
            fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={0.7}
          />
          {/* Center seam */}
          <line x1={0} y1={-d * 0.35} x2={0} y2={d * 0.35}
            stroke="rgba(255,255,255,0.08)" strokeWidth={0.5} />
        </g>
      )}

      {def.birdEye === 'rect' && (
        <g>
          <rect x={-w / 2} y={-d / 2} width={w} height={d} rx={1.5}
            fill={def.color} stroke={selStroke} strokeWidth={selWidth} opacity={0.92} />
          {/* Top surface detail */}
          <rect x={-w * 0.35} y={-d * 0.35} width={w * 0.7} height={d * 0.7} rx={1}
            fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={0.6} />
        </g>
      )}

      {def.birdEye === 'capsule' && (
        <g>
          {/* Capsule / rounded rectangle - snake beams and wings from above */}
          <rect x={-w / 2} y={-d / 2} width={w} height={d}
            rx={Math.min(w, d) * 0.45}
            fill={def.color} stroke={selStroke} strokeWidth={selWidth} opacity={0.92} />
          {/* Center seam line along length */}
          <line
            x1={0} y1={-d * 0.35} x2={0} y2={d * 0.35}
            stroke="rgba(255,255,255,0.15)" strokeWidth={0.6}
          />
          {/* Cross seams for inflatable tube look */}
          {d > w * 2 && (
            <>
              <line x1={-w * 0.3} y1={-d * 0.15} x2={w * 0.3} y2={-d * 0.15}
                stroke="rgba(255,255,255,0.08)" strokeWidth={0.4} />
              <line x1={-w * 0.3} y1={d * 0.15} x2={w * 0.3} y2={d * 0.15}
                stroke="rgba(255,255,255,0.08)" strokeWidth={0.4} />
            </>
          )}
        </g>
      )}

      {def.birdEye === 'stepped-rect' && (
        <g>
          {/* Outer stepped shape - temple/maya from above has a wider base and narrower top */}
          <rect x={-w / 2} y={-d / 2} width={w} height={d} rx={1}
            fill={def.color} stroke={selStroke} strokeWidth={selWidth} opacity={0.92} />
          {/* Inner step - the narrower top tier */}
          <rect x={-w * 0.32} y={-d * 0.32} width={w * 0.64} height={d * 0.64} rx={1}
            fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={0.8} />
          {/* Top tier */}
          <rect x={-w * 0.15} y={-d * 0.15} width={w * 0.3} height={d * 0.3} rx={0.5}
            fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.12)" strokeWidth={0.5} />
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

// Shadow shape helper
function ShadowShape({ birdEye, w, d, offset }: {
  birdEye: string; w: number; d: number; offset: number;
}) {
  if (birdEye === 'circle') {
    return <circle cx={offset} cy={offset} r={w / 2} fill="rgba(0,0,0,0.2)" />;
  }
  if (birdEye === 'triangle') {
    return (
      <polygon
        points={`${offset},${-d / 2 + offset} ${w / 2 + offset},${d / 2 + offset} ${-w / 2 + offset},${d / 2 + offset}`}
        fill="rgba(0,0,0,0.2)"
      />
    );
  }
  if (birdEye === 'capsule') {
    return (
      <rect x={-w / 2 + offset} y={-d / 2 + offset} width={w} height={d}
        rx={Math.min(w, d) * 0.45} fill="rgba(0,0,0,0.2)" />
    );
  }
  // rect, stepped-rect
  return (
    <rect x={-w / 2 + offset} y={-d / 2 + offset} width={w} height={d}
      rx={1.5} fill="rgba(0,0,0,0.2)" />
  );
}
