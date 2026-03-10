import { useRef, useState, useCallback, useEffect } from 'react';
import { Obstacle, FIELD_WIDTH_M, FIELD_HEIGHT_M } from '@/types/fieldLayout';
import { ObstacleSVG } from './ObstacleSVG';

interface FieldCanvasProps {
  obstacles: Obstacle[];
  onObstaclesChange?: (obstacles: Obstacle[]) => void;
  interactive?: boolean;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  showLabels?: boolean;
}

const CALLOUT_PREFIX: Record<string, string> = {
  'tall-cake': 'TC',
  'small-cake': 'SC',
  'dorito-big': 'D',
  'dorito-small': 'd',
  'snake': 'S',
  'temple': 'T',
  'temple-maya': 'TM',
  'brick': 'B',
  'wing': 'W',
  'mini-race': 'MR',
  'can': 'C',
  'cone': 'K',
};

function generateCalloutLabels(obstacles: Obstacle[]): Record<string, string> {
  const counters: Record<string, number> = {};
  const labels: Record<string, string> = {};
  obstacles.forEach((obs) => {
    const prefix = CALLOUT_PREFIX[obs.type] || '?';
    counters[obs.type] = (counters[obs.type] || 0) + 1;
    labels[obs.id] = `${prefix}${counters[obs.type]}`;
  });
  return labels;
}

// Field aspect ratio: 45m wide × 36m deep = 1.25:1
const FIELD_ASPECT = FIELD_WIDTH_M / FIELD_HEIGHT_M;

export function FieldCanvas({
  obstacles,
  onObstaclesChange,
  interactive = false,
  selectedId,
  onSelect,
}: FieldCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ width: 800, height: 640 });
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect;
      setDims({ width, height: width / FIELD_ASPECT });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const svgToField = useCallback(
    (clientX: number, clientY: number) => {
      const svg = containerRef.current?.querySelector('svg');
      if (!svg) return { x: 50, y: 50 };
      const rect = svg.getBoundingClientRect();
      return {
        x: ((clientX - rect.left) / rect.width) * 100,
        y: ((clientY - rect.top) / rect.height) * 100,
      };
    },
    []
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, id: string) => {
      if (!interactive) return;
      onSelect?.(id);
      const pos = svgToField(e.clientX, e.clientY);
      const obs = obstacles.find((o) => o.id === id);
      if (!obs) return;
      setDragOffset({ x: pos.x - obs.x, y: pos.y - obs.y });
      setDragging(id);
      (e.target as Element).setPointerCapture?.(e.pointerId);
    },
    [interactive, obstacles, onSelect, svgToField]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging || !onObstaclesChange) return;
      const pos = svgToField(e.clientX, e.clientY);
      const newX = Math.max(1, Math.min(99, pos.x - dragOffset.x));
      const newY = Math.max(1, Math.min(99, pos.y - dragOffset.y));
      onObstaclesChange(
        obstacles.map((o) =>
          o.id === dragging ? { ...o, x: newX, y: newY } : o
        )
      );
    },
    [dragging, dragOffset, obstacles, onObstaclesChange, svgToField]
  );

  const handlePointerUp = useCallback(() => {
    setDragging(null);
  }, []);

  const handleBackgroundClick = () => {
    onSelect?.(null);
  };

  // Grid spacing in metres for reference lines
  const gridSpacingM = 5;
  const gridLinesX = Math.floor(FIELD_WIDTH_M / gridSpacingM);
  const gridLinesY = Math.floor(FIELD_HEIGHT_M / gridSpacingM);

  return (
    <div ref={containerRef} className="w-full">
      <svg
        width={dims.width}
        height={dims.height}
        viewBox={`0 0 ${dims.width} ${dims.height}`}
        className="rounded-lg border border-border/50 select-none"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{ touchAction: 'none' }}
      >
        {/* Field background - grass green */}
        <rect width={dims.width} height={dims.height} fill="hsl(120, 35%, 20%)" rx={4} />
        
        {/* Alternating turf strips (like mowed grass) */}
        {Array.from({ length: gridLinesX }).map((_, i) => (
          i % 2 === 0 ? (
            <rect
              key={`turf-${i}`}
              x={(dims.width / gridLinesX) * i}
              y={0}
              width={dims.width / gridLinesX}
              height={dims.height}
              fill="hsl(120, 32%, 21%)"
            />
          ) : null
        ))}

        {/* Grid lines - 5m intervals */}
        {Array.from({ length: gridLinesX + 1 }).map((_, i) => (
          <line
            key={`gx-${i}`}
            x1={(dims.width / gridLinesX) * i}
            y1={0}
            x2={(dims.width / gridLinesX) * i}
            y2={dims.height}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={0.5}
          />
        ))}
        {Array.from({ length: gridLinesY + 1 }).map((_, i) => (
          <line
            key={`gy-${i}`}
            x1={0}
            y1={(dims.height / gridLinesY) * i}
            x2={dims.width}
            y2={(dims.height / gridLinesY) * i}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={0.5}
          />
        ))}

        {/* Center line (50-yard line) */}
        <line
          x1={dims.width / 2}
          y1={0}
          x2={dims.width / 2}
          y2={dims.height}
          stroke="rgba(255,255,255,0.2)"
          strokeWidth={1.5}
          strokeDasharray="6,4"
        />

        {/* Boundary netting outline */}
        <rect
          x={2}
          y={2}
          width={dims.width - 4}
          height={dims.height - 4}
          fill="none"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth={2}
          rx={4}
        />

        {/* Start boxes - 3m × 3m boxes */}
        {(() => {
          const boxW = (3 / FIELD_WIDTH_M) * dims.width;
          const boxH = (3 / FIELD_HEIGHT_M) * dims.height;
          const inset = (1 / FIELD_WIDTH_M) * dims.width;
          return (
            <>
              {/* Blue start box - left */}
              <rect
                x={inset}
                y={dims.height / 2 - boxH / 2}
                width={boxW}
                height={boxH}
                fill="hsla(200, 80%, 50%, 0.15)"
                stroke="hsl(200, 80%, 50%)"
                strokeWidth={1.5}
                rx={2}
              />
              {/* Red start box - right */}
              <rect
                x={dims.width - inset - boxW}
                y={dims.height / 2 - boxH / 2}
                width={boxW}
                height={boxH}
                fill="hsla(0, 80%, 50%, 0.15)"
                stroke="hsl(0, 80%, 50%)"
                strokeWidth={1.5}
                rx={2}
              />
            </>
          );
        })()}

        {/* Team labels */}
        <text
          x={12}
          y={16}
          fill="hsl(200, 70%, 60%)"
          fontSize={11}
          fontWeight={700}
          fontFamily="monospace"
          opacity={0.5}
        >
          BLUE
        </text>
        <text
          x={dims.width - 12}
          y={16}
          fill="hsl(0, 70%, 60%)"
          fontSize={11}
          fontWeight={700}
          fontFamily="monospace"
          textAnchor="end"
          opacity={0.5}
        >
          RED
        </text>

        {/* Dimension labels */}
        <text
          x={dims.width / 2}
          y={dims.height - 6}
          fill="rgba(255,255,255,0.25)"
          fontSize={9}
          fontFamily="monospace"
          textAnchor="middle"
        >
          {FIELD_WIDTH_M}m
        </text>
        <text
          x={8}
          y={dims.height / 2}
          fill="rgba(255,255,255,0.25)"
          fontSize={9}
          fontFamily="monospace"
          textAnchor="middle"
          transform={`rotate(-90, 8, ${dims.height / 2})`}
        >
          {FIELD_HEIGHT_M}m
        </text>

        {/* Click background to deselect */}
        <rect
          width={dims.width}
          height={dims.height}
          fill="transparent"
          onClick={handleBackgroundClick}
        />

        {/* Obstacles */}
        {obstacles.map((obs) => (
          <ObstacleSVG
            key={obs.id}
            obstacle={obs}
            fieldWidth={dims.width}
            fieldHeight={dims.height}
            selected={selectedId === obs.id}
            onPointerDown={handlePointerDown}
            interactive={interactive}
          />
        ))}
      </svg>
    </div>
  );
}
