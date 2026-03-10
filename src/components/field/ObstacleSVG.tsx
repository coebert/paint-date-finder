import { Obstacle, OBSTACLE_DEFINITIONS, FIELD_WIDTH_M, FIELD_HEIGHT_M } from '@/types/fieldLayout';

interface ObstacleSVGProps {
  obstacle: Obstacle;
  fieldWidth: number;
  fieldHeight: number;
  selected?: boolean;
  onPointerDown?: (e: React.PointerEvent, id: string) => void;
  interactive?: boolean;
}

/**
 * Converts real-world metres to SVG pixels based on field dimensions.
 */
function metresToPx(metres: number, axisSize: number, axisMetres: number): number {
  return (metres / axisMetres) * axisSize;
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

  // Convert position from percentage to SVG coords
  const x = (obstacle.x / 100) * fieldWidth;
  const y = (obstacle.y / 100) * fieldHeight;

  // Convert real-world dimensions to SVG pixels
  const w = metresToPx(def.widthM, fieldWidth, FIELD_WIDTH_M);
  const d = metresToPx(def.depthM, fieldHeight, FIELD_HEIGHT_M);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (interactive && onPointerDown) {
      e.stopPropagation();
      onPointerDown(e, obstacle.id);
    }
  };

  const cursor = interactive ? 'grab' : 'default';
  const strokeColor = selected ? 'hsl(45, 100%, 70%)' : 'rgba(0,0,0,0.5)';
  const strokeWidth = selected ? 2.5 : 1;
  const fillOpacity = 0.92;

  // Shadow for depth effect (bird's eye)
  const shadowOffset = Math.min(w, d) * 0.08;

  return (
    <g
      transform={`translate(${x}, ${y}) rotate(${obstacle.rotation})`}
      onPointerDown={handlePointerDown}
      style={{ cursor }}
    >
      {/* Shadow layer */}
      {def.shape === 'circle' && (
        <ellipse
          cx={shadowOffset}
          cy={shadowOffset}
          rx={w / 2}
          ry={d / 2}
          fill="rgba(0,0,0,0.25)"
        />
      )}
      {(def.shape === 'rect' || def.shape === 'rounded-rect' || def.shape === 'wing') && (
        <rect
          x={-w / 2 + shadowOffset}
          y={-d / 2 + shadowOffset}
          width={w}
          height={d}
          rx={def.shape === 'rounded-rect' || def.shape === 'wing' ? Math.min(w, d) * 0.3 : 2}
          fill="rgba(0,0,0,0.25)"
        />
      )}
      {def.shape === 'triangle' && (
        <polygon
          points={`0,${-d / 2 + shadowOffset} ${w / 2 + shadowOffset},${d / 2 + shadowOffset} ${-w / 2 + shadowOffset},${d / 2 + shadowOffset}`}
          fill="rgba(0,0,0,0.25)"
        />
      )}

      {/* Main shape - bird's eye view footprint */}
      {def.shape === 'circle' && (
        <>
          {/* Outer circle */}
          <circle
            cx={0}
            cy={0}
            r={w / 2}
            fill={def.color}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            opacity={fillOpacity}
          />
          {/* Inner ring for depth effect (top of cylinder/cake) */}
          <circle
            cx={0}
            cy={0}
            r={w / 2 * 0.65}
            fill="none"
            stroke="rgba(255,255,255,0.2)"
            strokeWidth={1}
          />
          {/* Center dot */}
          <circle
            cx={0}
            cy={0}
            r={w / 2 * 0.12}
            fill="rgba(255,255,255,0.15)"
          />
        </>
      )}

      {def.shape === 'triangle' && (
        <>
          {/* Triangle footprint - equilateral from above */}
          <polygon
            points={`0,${-d / 2} ${w / 2},${d / 2} ${-w / 2},${d / 2}`}
            fill={def.color}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            opacity={fillOpacity}
          />
          {/* Inner triangle for inflatable seam look */}
          <polygon
            points={`0,${-d / 2 * 0.5} ${w / 2 * 0.5},${d / 2 * 0.5} ${-w / 2 * 0.5},${d / 2 * 0.5}`}
            fill="none"
            stroke="rgba(255,255,255,0.15)"
            strokeWidth={0.8}
          />
        </>
      )}

      {def.shape === 'rect' && (
        <>
          <rect
            x={-w / 2}
            y={-d / 2}
            width={w}
            height={d}
            rx={2}
            fill={def.color}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            opacity={fillOpacity}
          />
          {/* Top surface line */}
          <rect
            x={-w / 2 + w * 0.15}
            y={-d / 2 + d * 0.15}
            width={w * 0.7}
            height={d * 0.7}
            rx={1}
            fill="none"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth={0.8}
          />
        </>
      )}

      {def.shape === 'rounded-rect' && (
        <>
          <rect
            x={-w / 2}
            y={-d / 2}
            width={w}
            height={d}
            rx={Math.min(w, d) * 0.4}
            fill={def.color}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            opacity={fillOpacity}
          />
          {/* Center seam line */}
          <line
            x1={0}
            y1={-d / 2 + d * 0.2}
            x2={0}
            y2={d / 2 - d * 0.2}
            stroke="rgba(255,255,255,0.15)"
            strokeWidth={0.8}
          />
        </>
      )}

      {def.shape === 'wing' && (
        <>
          {/* Wing shape - wider rectangle with rounded ends */}
          <rect
            x={-w / 2}
            y={-d / 2}
            width={w}
            height={d}
            rx={Math.min(w, d) * 0.25}
            fill={def.color}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            opacity={fillOpacity}
          />
          {/* Central spine */}
          <line
            x1={-w * 0.3}
            y1={0}
            x2={w * 0.3}
            y2={0}
            stroke="rgba(255,255,255,0.15)"
            strokeWidth={0.8}
          />
        </>
      )}

      {/* Selection indicator */}
      {selected && (
        <circle
          cx={0}
          cy={0}
          r={Math.max(w, d) / 2 + 4}
          fill="none"
          stroke="hsl(45, 100%, 70%)"
          strokeWidth={1.5}
          strokeDasharray="4,3"
          opacity={0.7}
        />
      )}
    </g>
  );
}
