import { useRef, useState, useCallback, useEffect } from 'react';
import { Obstacle } from '@/types/fieldLayout';
import { ObstacleSVG } from './ObstacleSVG';

interface FieldCanvasProps {
  obstacles: Obstacle[];
  onObstaclesChange?: (obstacles: Obstacle[]) => void;
  interactive?: boolean;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
}

const FIELD_ASPECT = 1.6; // width:height ratio for a standard paintball field

export function FieldCanvas({
  obstacles,
  onObstaclesChange,
  interactive = false,
  selectedId,
  onSelect,
}: FieldCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ width: 800, height: 500 });
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
      const newX = Math.max(2, Math.min(98, pos.x - dragOffset.x));
      const newY = Math.max(2, Math.min(98, pos.y - dragOffset.y));
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
        {/* Field background */}
        <rect width={dims.width} height={dims.height} fill="hsl(120, 35%, 22%)" rx={8} />
        
        {/* Turf texture lines */}
        {Array.from({ length: 20 }).map((_, i) => (
          <line
            key={i}
            x1={(dims.width / 20) * i}
            y1={0}
            x2={(dims.width / 20) * i}
            y2={dims.height}
            stroke="hsl(120, 30%, 24%)"
            strokeWidth={1}
          />
        ))}

        {/* Center line */}
        <line
          x1={dims.width / 2}
          y1={0}
          x2={dims.width / 2}
          y2={dims.height}
          stroke="rgba(255,255,255,0.15)"
          strokeWidth={2}
          strokeDasharray="8,8"
        />

        {/* Boundary lines */}
        <rect
          x={4}
          y={4}
          width={dims.width - 8}
          height={dims.height - 8}
          fill="none"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth={2}
          rx={6}
        />

        {/* Start boxes */}
        <rect
          x={8}
          y={dims.height * 0.35}
          width={dims.width * 0.03}
          height={dims.height * 0.3}
          fill="none"
          stroke="hsl(200, 80%, 50%)"
          strokeWidth={2}
          opacity={0.5}
          rx={2}
        />
        <rect
          x={dims.width - 8 - dims.width * 0.03}
          y={dims.height * 0.35}
          width={dims.width * 0.03}
          height={dims.height * 0.3}
          fill="none"
          stroke="hsl(0, 80%, 50%)"
          strokeWidth={2}
          opacity={0.5}
          rx={2}
        />

        {/* Team labels */}
        <text
          x={dims.width * 0.02}
          y={dims.height * 0.33}
          fill="hsl(200, 80%, 60%)"
          fontSize={10}
          fontFamily="var(--font-display)"
          opacity={0.6}
        >
          BLUE
        </text>
        <text
          x={dims.width * 0.96}
          y={dims.height * 0.33}
          fill="hsl(0, 80%, 60%)"
          fontSize={10}
          fontFamily="var(--font-display)"
          textAnchor="end"
          opacity={0.6}
        >
          RED
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
