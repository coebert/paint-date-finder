import { useRef, useState, useCallback } from 'react';
import { Annotation, AnnotationTool, Point } from '@/types/annotations';
import { FIELD_WIDTH_M, FIELD_HEIGHT_M } from '@/types/fieldLayout';

interface AnnotationLayerProps {
  annotations: Annotation[];
  activeTool: AnnotationTool;
  activeColor: string;
  playerNumber: number;
  onAdd: (annotation: Annotation) => void;
  onUpdate: (id: string, partial: Partial<Annotation>) => void;
  onDelete: (id: string) => void;
  fieldWidth: number;
  fieldHeight: number;
}

let nextAnnotationId = 1;
function genAnnotationId() {
  return `ann-${Date.now()}-${nextAnnotationId++}`;
}

function svgPoint(e: React.PointerEvent | React.MouseEvent, svg: SVGSVGElement): Point {
  const rect = svg.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) / rect.width) * 100,
    y: ((e.clientY - rect.top) / rect.height) * 100,
  };
}

export function AnnotationLayer({
  annotations,
  activeTool,
  activeColor,
  playerNumber,
  onAdd,
  onUpdate,
  onDelete,
  fieldWidth,
  fieldHeight,
}: AnnotationLayerProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [drawing, setDrawing] = useState<{ id: string; points: Point[] } | null>(null);
  const [dragging, setDragging] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const [editingText, setEditingText] = useState<string | null>(null);
  const [textInput, setTextInput] = useState('');
  const [textPos, setTextPos] = useState<Point | null>(null);

  const pxX = useCallback((pct: number) => (pct / 100) * fieldWidth, [fieldWidth]);
  const pxY = useCallback((pct: number) => (pct / 100) * fieldHeight, [fieldHeight]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!svgRef.current) return;
    const pt = svgPoint(e, svgRef.current);

    if (activeTool === 'player') {
      onAdd({
        kind: 'player',
        id: genAnnotationId(),
        x: pt.x,
        y: pt.y,
        number: playerNumber,
        color: activeColor,
      });
    } else if (activeTool === 'arrow' || activeTool === 'freehand') {
      const id = genAnnotationId();
      setDrawing({ id, points: [pt] });
      (e.target as Element).setPointerCapture?.(e.pointerId);
    } else if (activeTool === 'text') {
      setTextPos(pt);
      setTextInput('');
      setEditingText('new');
    }
  }, [activeTool, activeColor, playerNumber, onAdd]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!svgRef.current) return;
    const pt = svgPoint(e, svgRef.current);

    if (drawing) {
      setDrawing(prev => prev ? { ...prev, points: [...prev.points, pt] } : null);
    } else if (dragging) {
      const ann = annotations.find(a => a.id === dragging.id);
      if (ann && (ann.kind === 'player' || ann.kind === 'text')) {
        onUpdate(dragging.id, {
          x: Math.max(2, Math.min(98, pt.x - dragging.offsetX)),
          y: Math.max(2, Math.min(98, pt.y - dragging.offsetY)),
        } as any);
      }
    }
  }, [drawing, dragging, annotations, onUpdate]);

  const handlePointerUp = useCallback(() => {
    if (drawing) {
      if (drawing.points.length >= 2) {
        if (activeTool === 'arrow') {
          // Simplify to key waypoints for arrows
          const pts = simplifyPoints(drawing.points, 1.5);
          onAdd({
            kind: 'arrow',
            id: drawing.id,
            points: pts,
            color: activeColor,
          });
        } else {
          onAdd({
            kind: 'freehand',
            id: drawing.id,
            points: drawing.points,
            color: activeColor,
          });
        }
      }
      setDrawing(null);
    }
    setDragging(null);
  }, [drawing, activeTool, activeColor, onAdd]);

  const handleMarkerPointerDown = useCallback((e: React.PointerEvent, ann: Annotation) => {
    if (activeTool !== 'select') return;
    e.stopPropagation();
    if (!svgRef.current) return;
    const pt = svgPoint(e, svgRef.current);
    if (ann.kind === 'player' || ann.kind === 'text') {
      setDragging({ id: ann.id, offsetX: pt.x - ann.x, offsetY: pt.y - ann.y });
      (e.target as Element).setPointerCapture?.(e.pointerId);
    }
  }, [activeTool]);

  const handleMarkerDoubleClick = useCallback((e: React.MouseEvent, ann: Annotation) => {
    e.stopPropagation();
    if (activeTool === 'select') {
      onDelete(ann.id);
    }
  }, [activeTool, onDelete]);

  const handleTextSubmit = useCallback(() => {
    if (textPos && textInput.trim()) {
      onAdd({
        kind: 'text',
        id: genAnnotationId(),
        x: textPos.x,
        y: textPos.y,
        text: textInput.trim(),
        color: activeColor,
      });
    }
    setEditingText(null);
    setTextPos(null);
    setTextInput('');
  }, [textPos, textInput, activeColor, onAdd]);

  const cursorStyle = activeTool === 'select' ? 'default'
    : activeTool === 'player' ? 'crosshair'
    : activeTool === 'arrow' ? 'crosshair'
    : activeTool === 'freehand' ? 'crosshair'
    : activeTool === 'text' ? 'text'
    : 'default';

  return (
    <>
      <svg
        ref={svgRef}
        width={fieldWidth}
        height={fieldHeight}
        viewBox={`0 0 ${fieldWidth} ${fieldHeight}`}
        className="absolute inset-0 rounded-lg"
        style={{ cursor: cursorStyle, touchAction: 'none' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Render existing annotations */}
        {annotations.map(ann => {
          switch (ann.kind) {
            case 'player':
              return (
                <g
                  key={ann.id}
                  transform={`translate(${pxX(ann.x)}, ${pxY(ann.y)})`}
                  onPointerDown={(e) => handleMarkerPointerDown(e, ann)}
                  onDoubleClick={(e) => handleMarkerDoubleClick(e, ann)}
                  style={{ cursor: activeTool === 'select' ? 'grab' : 'default' }}
                >
                  {/* Shadow */}
                  <circle r={13} fill="rgba(0,0,0,0.3)" cx={1} cy={1} />
                  {/* Marker body */}
                  <circle r={12} fill={ann.color} stroke="rgba(255,255,255,0.9)" strokeWidth={2} />
                  {/* Number */}
                  <text
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="white"
                    fontSize={13}
                    fontWeight={800}
                    fontFamily="monospace"
                    style={{ pointerEvents: 'none' }}
                  >
                    {ann.number}
                  </text>
                </g>
              );

            case 'arrow': {
              if (ann.points.length < 2) return null;
              const d = pointsToPath(ann.points, fieldWidth, fieldHeight);
              const lastTwo = ann.points.slice(-2);
              const angle = Math.atan2(
                (lastTwo[1].y - lastTwo[0].y) * fieldHeight,
                (lastTwo[1].x - lastTwo[0].x) * fieldWidth
              ) * (180 / Math.PI);
              const tipX = pxX(lastTwo[1].x);
              const tipY = pxY(lastTwo[1].y);
              return (
                <g
                  key={ann.id}
                  onDoubleClick={(e) => handleMarkerDoubleClick(e, ann)}
                  style={{ cursor: activeTool === 'select' ? 'pointer' : 'default' }}
                >
                  {/* Shadow */}
                  <path d={d} fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
                  {/* Main line */}
                  <path
                    d={d}
                    fill="none"
                    stroke={ann.color}
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray={ann.dashed ? '8,4' : undefined}
                  />
                  {/* Arrowhead */}
                  <polygon
                    points="-8,-4 0,0 -8,4"
                    fill={ann.color}
                    transform={`translate(${tipX}, ${tipY}) rotate(${angle})`}
                    stroke="rgba(255,255,255,0.5)"
                    strokeWidth={0.5}
                  />
                </g>
              );
            }

            case 'freehand': {
              if (ann.points.length < 2) return null;
              const d = pointsToPath(ann.points, fieldWidth, fieldHeight);
              return (
                <g
                  key={ann.id}
                  onDoubleClick={(e) => handleMarkerDoubleClick(e, ann)}
                  style={{ cursor: activeTool === 'select' ? 'pointer' : 'default' }}
                >
                  <path d={d} fill="none" stroke="rgba(0,0,0,0.2)" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
                  <path d={d} fill="none" stroke={ann.color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </g>
              );
            }

            case 'text':
              return (
                <g
                  key={ann.id}
                  transform={`translate(${pxX(ann.x)}, ${pxY(ann.y)})`}
                  onPointerDown={(e) => handleMarkerPointerDown(e, ann)}
                  onDoubleClick={(e) => handleMarkerDoubleClick(e, ann)}
                  style={{ cursor: activeTool === 'select' ? 'grab' : 'default' }}
                >
                  {/* Background pill */}
                  <rect
                    x={-2}
                    y={-14}
                    width={ann.text.length * 7.5 + 10}
                    height={20}
                    rx={4}
                    fill="rgba(0,0,0,0.7)"
                    stroke={ann.color}
                    strokeWidth={1.5}
                  />
                  <text
                    x={3}
                    y={0}
                    fill={ann.color}
                    fontSize={12}
                    fontWeight={700}
                    fontFamily="monospace"
                    style={{ pointerEvents: 'none' }}
                  >
                    {ann.text}
                  </text>
                </g>
              );

            default:
              return null;
          }
        })}

        {/* Live drawing preview */}
        {drawing && drawing.points.length >= 2 && (
          <path
            d={pointsToPath(drawing.points, fieldWidth, fieldHeight)}
            fill="none"
            stroke={activeColor}
            strokeWidth={activeTool === 'arrow' ? 2.5 : 2}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={activeTool === 'arrow' ? undefined : '4,2'}
            opacity={0.7}
          />
        )}
      </svg>

      {/* Text input popover */}
      {editingText && textPos && (
        <div
          className="absolute z-50"
          style={{
            left: `${textPos.x}%`,
            top: `${textPos.y}%`,
            transform: 'translate(-4px, -30px)',
          }}
        >
          <form
            onSubmit={(e) => { e.preventDefault(); handleTextSubmit(); }}
            className="flex gap-1"
          >
            <input
              autoFocus
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onBlur={handleTextSubmit}
              placeholder="Label..."
              className="h-7 w-32 rounded bg-background border border-border text-xs px-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </form>
        </div>
      )}
    </>
  );
}

/** Convert array of percentage points to SVG path */
function pointsToPath(points: Point[], fw: number, fh: number): string {
  return points.reduce((acc, pt, i) => {
    const x = (pt.x / 100) * fw;
    const y = (pt.y / 100) * fh;
    return acc + (i === 0 ? `M${x},${y}` : ` L${x},${y}`);
  }, '');
}

/** Ramer-Douglas-Peucker simplification */
function simplifyPoints(points: Point[], epsilon: number): Point[] {
  if (points.length <= 2) return points;
  let maxDist = 0;
  let maxIdx = 0;
  const first = points[0];
  const last = points[points.length - 1];
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicularDist(points[i], first, last);
    if (d > maxDist) { maxDist = d; maxIdx = i; }
  }
  if (maxDist > epsilon) {
    const left = simplifyPoints(points.slice(0, maxIdx + 1), epsilon);
    const right = simplifyPoints(points.slice(maxIdx), epsilon);
    return [...left.slice(0, -1), ...right];
  }
  return [first, last];
}

function perpendicularDist(pt: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return Math.sqrt((pt.x - a.x) ** 2 + (pt.y - a.y) ** 2);
  return Math.abs(dy * pt.x - dx * pt.y + b.x * a.y - b.y * a.x) / len;
}
