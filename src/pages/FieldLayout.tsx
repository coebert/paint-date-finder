import { useState, useCallback, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Eye, PenTool, RotateCcw, RotateCw, Trash2, Download, Copy, Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { FieldCanvas } from '@/components/field/FieldCanvas';
import { ObstaclePalette } from '@/components/field/ObstaclePalette';
import { FieldStreetView } from '@/components/field/FieldStreetView';
import { CPPS_FIELD_LAYOUT, Obstacle, ObstacleType, OBSTACLE_DEFINITIONS } from '@/types/fieldLayout';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

let nextId = 1;
function genId() {
  return `custom-${Date.now()}-${nextId++}`;
}

export default function FieldLayout() {
  const [designObstacles, setDesignObstacles] = useState<Obstacle[]>([...CPPS_FIELD_LAYOUT]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [streetViewPoint, setStreetViewPoint] = useState<{ x: number; y: number }>({ x: 10, y: 50 });
  const [streetViewObstacles, setStreetViewObstacles] = useState<Obstacle[]>(CPPS_FIELD_LAYOUT);
  const [streetViewSource, setStreetViewSource] = useState<'cpps' | 'custom'>('cpps');

  const selectedObstacle = designObstacles.find((o) => o.id === selectedId) || null;

  const handleAddObstacle = useCallback((type: ObstacleType) => {
    const newObs: Obstacle = {
      id: genId(),
      type,
      x: 45 + Math.random() * 10,
      y: 45 + Math.random() * 10,
      rotation: 0,
    };
    setDesignObstacles((prev) => [...prev, newObs]);
    setSelectedId(newObs.id);
    toast.success(`Added ${OBSTACLE_DEFINITIONS[type].label}`);
  }, []);

  const handleRotate = useCallback(
    (degrees: number) => {
      if (!selectedId) return;
      setDesignObstacles((prev) =>
        prev.map((o) =>
          o.id === selectedId ? { ...o, rotation: (o.rotation + degrees) % 360 } : o
        )
      );
    },
    [selectedId]
  );

  const handleDelete = useCallback(() => {
    if (!selectedId) return;
    setDesignObstacles((prev) => prev.filter((o) => o.id !== selectedId));
    setSelectedId(null);
    toast.success('Obstacle removed');
  }, [selectedId]);

  const handleClearAll = useCallback(() => {
    setDesignObstacles([]);
    setSelectedId(null);
    toast.success('Field cleared');
  }, []);

  const handleLoadCPPS = useCallback(() => {
    setDesignObstacles([...CPPS_FIELD_LAYOUT]);
    setSelectedId(null);
    toast.success('Loaded CPPS layout');
  }, []);

  const handleDuplicate = useCallback(() => {
    if (!selectedId) return;
    const src = designObstacles.find((o) => o.id === selectedId);
    if (!src) return;
    const dup: Obstacle = {
      ...src,
      id: genId(),
      x: Math.min(95, src.x + 3),
      y: Math.min(95, src.y + 3),
    };
    setDesignObstacles((prev) => [...prev, dup]);
    setSelectedId(dup.id);
    toast.success('Obstacle duplicated');
  }, [selectedId, designObstacles]);

  // Handle clicking on the mini-map in street view to pick viewpoint
  const handleStreetViewMapClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setStreetViewPoint({ x: Math.max(2, Math.min(98, x)), y: Math.max(2, Math.min(98, y)) });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="tactical-gradient border-b border-border/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h1 className="font-display text-2xl md:text-3xl tracking-wider">FIELD LAYOUTS</h1>
              <p className="text-sm text-muted-foreground">
                View CPPS competition layouts & design your own
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Tabs defaultValue="current" className="space-y-6">
          <TabsList className="bg-secondary/50">
            <TabsTrigger value="current" className="gap-2 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
              <Eye className="h-4 w-4" />
              <span className="hidden sm:inline">Current Layout</span>
              <span className="sm:hidden">Layout</span>
            </TabsTrigger>
            <TabsTrigger value="designer" className="gap-2 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
              <PenTool className="h-4 w-4" />
              <span className="hidden sm:inline">Design Your Own</span>
              <span className="sm:hidden">Design</span>
            </TabsTrigger>
            <TabsTrigger value="streetview" className="gap-2 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
              <Compass className="h-4 w-4" />
              <span className="hidden sm:inline">Street View</span>
              <span className="sm:hidden">3D View</span>
            </TabsTrigger>
          </TabsList>

          {/* Current CPPS Layout */}
          <TabsContent value="current" className="space-y-6">
            <Card className="bg-card border-border/50">
              <CardHeader>
                <CardTitle className="font-display tracking-wider flex items-center gap-3">
                  CPPS COMPETITION FIELD
                  <Badge className="bg-accent text-accent-foreground">2025 Season</Badge>
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Standard Sup'Air inflatable field layout used in CPPS tournament play.
                  The field is symmetrical with a center-line dividing two mirror-image halves.
                </p>
              </CardHeader>
              <CardContent>
                <FieldCanvas obstacles={CPPS_FIELD_LAYOUT} />
              </CardContent>
            </Card>

            {/* Legend */}
            <Card className="bg-card border-border/50">
              <CardHeader>
                <CardTitle className="font-display tracking-wider text-lg">OBSTACLE KEY</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {Object.values(OBSTACLE_DEFINITIONS).map((def) => (
                    <div key={def.type} className="flex items-center gap-3 text-sm">
                      <div
                        className="w-5 h-5 flex-shrink-0"
                        style={{
                          backgroundColor: def.color,
                        borderRadius: def.birdEye === 'circle' ? '50%' : def.birdEye === 'triangle' ? '2px' : '3px',
                        clipPath: def.birdEye === 'triangle' ? 'polygon(50% 0%, 100% 100%, 0% 100%)' : undefined,
                        }}
                      />
                      <div>
                        <span className="text-foreground text-xs font-medium">{def.label}</span>
                        <span className="text-muted-foreground text-[10px] block">
                          {def.widthM}×{def.depthM}m · {def.heightM}m tall
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Designer */}
          <TabsContent value="designer" className="space-y-6">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Field */}
              <div className="flex-1">
                <Card className="bg-card border-border/50">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <CardTitle className="font-display tracking-wider text-lg">
                        YOUR FIELD DESIGN
                      </CardTitle>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={handleLoadCPPS} className="text-xs gap-1">
                          <Download className="w-3 h-3" /> Load CPPS
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleClearAll} className="text-xs gap-1 text-destructive hover:text-destructive">
                          <Trash2 className="w-3 h-3" /> Clear All
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Drag obstacles to reposition them. Select one to rotate, duplicate or delete it.
                    </p>
                  </CardHeader>
                  <CardContent>
                    <FieldCanvas
                      obstacles={designObstacles}
                      onObstaclesChange={setDesignObstacles}
                      interactive
                      selectedId={selectedId}
                      onSelect={setSelectedId}
                    />
                  </CardContent>
                </Card>

                {/* Selection controls */}
                {selectedObstacle && (
                  <Card className="mt-4 bg-card border-accent/30">
                    <CardContent className="py-3 px-4">
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded-sm"
                            style={{ backgroundColor: OBSTACLE_DEFINITIONS[selectedObstacle.type].color }}
                          />
                          <span className="text-sm font-medium">
                            {OBSTACLE_DEFINITIONS[selectedObstacle.type].label}
                          </span>
                        </div>
                        <div className="flex gap-1 ml-auto">
                          <Button variant="outline" size="sm" onClick={() => handleRotate(-15)} className="h-8 w-8 p-0">
                            <RotateCcw className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleRotate(15)} className="h-8 w-8 p-0">
                            <RotateCw className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={handleDuplicate} className="h-8 w-8 p-0">
                            <Copy className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={handleDelete} className="h-8 w-8 p-0 text-destructive hover:text-destructive">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Sidebar palette */}
              <div className="w-full lg:w-64 flex-shrink-0">
                <Card className="bg-card border-border/50 sticky top-4">
                  <CardHeader className="pb-3">
                    <CardTitle className="font-display tracking-wider text-sm">ADD OBSTACLES</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Click to add to the field
                    </p>
                  </CardHeader>
                  <CardContent>
                    <ObstaclePalette onAdd={handleAddObstacle} />
                  </CardContent>
                </Card>

                <Card className="bg-card border-border/50 mt-4">
                  <CardContent className="py-4">
                    <p className="text-xs text-muted-foreground">
                      <strong className="text-foreground">Tips:</strong><br />
                      • Drag obstacles to move them<br />
                      • Select &amp; use rotate buttons<br />
                      • Duplicate to mirror layouts<br />
                      • Load CPPS as a starting point
                    </p>
                    <div className="mt-3 pt-3 border-t border-border/50">
                      <p className="text-xs text-muted-foreground">
                        <span className="text-foreground font-medium">{designObstacles.length}</span> obstacles placed
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Street View */}
          <TabsContent value="streetview" className="space-y-6">
            <Card className="bg-card border-border/50">
              <CardHeader>
                <CardTitle className="font-display tracking-wider flex items-center gap-3">
                  FIELD STREET VIEW
                  <Badge variant="outline" className="border-accent/50 text-accent">3D</Badge>
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Click anywhere on the mini-map below to place yourself on the field,
                  then drag inside the 3D view to look around.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Source selector */}
                <div className="flex gap-2">
                  <Button
                    variant={streetViewSource === 'cpps' ? 'default' : 'outline'}
                    size="sm"
                    className="text-xs"
                    onClick={() => {
                      setStreetViewSource('cpps');
                      setStreetViewObstacles(CPPS_FIELD_LAYOUT);
                    }}
                  >
                    CPPS Layout
                  </Button>
                  <Button
                    variant={streetViewSource === 'custom' ? 'default' : 'outline'}
                    size="sm"
                    className="text-xs"
                    onClick={() => {
                      setStreetViewSource('custom');
                      setStreetViewObstacles(designObstacles);
                    }}
                  >
                    Your Design ({designObstacles.length} obstacles)
                  </Button>
                </div>

                {/* 3D View */}
                <Suspense fallback={<Skeleton className="w-full h-[400px] md:h-[500px] rounded-lg" />}>
                  <FieldStreetView
                    obstacles={streetViewObstacles}
                    viewPoint={streetViewPoint}
                    onViewPointChange={setStreetViewPoint}
                  />
                </Suspense>

                {/* Mini-map for position picking */}
                <div className="flex flex-col md:flex-row gap-4 items-start">
                  <div className="flex-1 w-full">
                    <p className="text-xs text-muted-foreground mb-2 font-medium">
                      CLICK TO SET YOUR VIEWPOINT
                    </p>
                    <StreetViewMiniMap
                      obstacles={streetViewObstacles}
                      viewPoint={streetViewPoint}
                      onClick={handleStreetViewMapClick}
                    />
                  </div>
                  <div className="w-full md:w-48 space-y-3">
                    <Card className="bg-secondary/50 border-border/30">
                      <CardContent className="py-3 px-4 space-y-2">
                        <p className="text-xs font-medium text-foreground">Controls</p>
                        <ul className="text-[11px] text-muted-foreground space-y-1">
                          <li>• Click mini-map to move</li>
                          <li>• Drag 3D view to look around</li>
                          <li>• Touch & swipe on mobile</li>
                        </ul>
                      </CardContent>
                    </Card>
                    <Card className="bg-secondary/50 border-border/30">
                      <CardContent className="py-3 px-4">
                        <p className="text-xs text-muted-foreground">
                          Position: <span className="text-foreground font-mono">{Math.round(streetViewPoint.x)}%, {Math.round(streetViewPoint.y)}%</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Eye height: <span className="text-foreground font-mono">1.7m</span>
                        </p>
                      </CardContent>
                    </Card>

                    {/* Quick position buttons */}
                    <div className="grid grid-cols-3 gap-1">
                      {[
                        { label: 'Blue Start', x: 5, y: 50 },
                        { label: 'Center', x: 50, y: 50 },
                        { label: 'Red Start', x: 95, y: 50 },
                        { label: 'Snake', x: 30, y: 20 },
                        { label: '50 Line', x: 50, y: 30 },
                        { label: 'Dorito', x: 70, y: 20 },
                      ].map((pos) => (
                        <Button
                          key={pos.label}
                          variant="outline"
                          size="sm"
                          className="text-[10px] h-7 px-1"
                          onClick={() => setStreetViewPoint({ x: pos.x, y: pos.y })}
                        >
                          {pos.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

// ---- Mini-map component for street view position picking ----
function StreetViewMiniMap({
  obstacles,
  viewPoint,
  onClick,
}: {
  obstacles: Obstacle[];
  viewPoint: { x: number; y: number };
  onClick: (e: React.MouseEvent<SVGSVGElement>) => void;
}) {
  const aspect = 45 / 36;
  const w = 450;
  const h = w / aspect;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="w-full rounded-lg border border-border/50 cursor-crosshair"
      onClick={onClick}
      style={{ maxHeight: 280 }}
    >
      {/* Field background */}
      <rect width={w} height={h} fill="hsl(120, 35%, 20%)" rx={4} />

      {/* Grid */}
      {Array.from({ length: 9 }).map((_, i) => (
        <line key={`gx-${i}`} x1={(w / 9) * (i + 1)} y1={0} x2={(w / 9) * (i + 1)} y2={h}
          stroke="rgba(255,255,255,0.06)" strokeWidth={0.5} />
      ))}
      {Array.from({ length: 7 }).map((_, i) => (
        <line key={`gy-${i}`} x1={0} y1={(h / 7) * (i + 1)} x2={w} y2={(h / 7) * (i + 1)}
          stroke="rgba(255,255,255,0.06)" strokeWidth={0.5} />
      ))}

      {/* Center line */}
      <line x1={w / 2} y1={0} x2={w / 2} y2={h}
        stroke="rgba(255,255,255,0.2)" strokeWidth={1} strokeDasharray="4,3" />

      {/* Boundary */}
      <rect x={2} y={2} width={w - 4} height={h - 4}
        fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={1.5} rx={3} />

      {/* Obstacles as simple dots */}
      {obstacles.map((obs) => {
        const def = OBSTACLE_DEFINITIONS[obs.type];
        const ox = (obs.x / 100) * w;
        const oy = (obs.y / 100) * h;
        const r = Math.max(4, ((def.widthM + def.depthM) / 2 / 45) * w);
        return (
          <circle key={obs.id} cx={ox} cy={oy} r={r}
            fill={def.color} opacity={0.85} />
        );
      })}

      {/* Viewpoint marker */}
      <circle
        cx={(viewPoint.x / 100) * w}
        cy={(viewPoint.y / 100) * h}
        r={8}
        fill="none"
        stroke="hsl(25, 95%, 53%)"
        strokeWidth={2}
      />
      <circle
        cx={(viewPoint.x / 100) * w}
        cy={(viewPoint.y / 100) * h}
        r={3}
        fill="hsl(25, 95%, 53%)"
      />
      {/* Pulsing ring */}
      <circle
        cx={(viewPoint.x / 100) * w}
        cy={(viewPoint.y / 100) * h}
        r={12}
        fill="none"
        stroke="hsl(25, 95%, 53%)"
        strokeWidth={1}
        opacity={0.4}
      >
        <animate attributeName="r" from="8" to="16" dur="1.5s" repeatCount="indefinite" />
        <animate attributeName="opacity" from="0.5" to="0" dur="1.5s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}
