import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Eye, PenTool, RotateCcw, RotateCw, Trash2, Download, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { FieldCanvas } from '@/components/field/FieldCanvas';
import { ObstaclePalette } from '@/components/field/ObstaclePalette';
import { CPPS_FIELD_LAYOUT, Obstacle, ObstacleType, OBSTACLE_DEFINITIONS } from '@/types/fieldLayout';
import { toast } from 'sonner';

let nextId = 1;
function genId() {
  return `custom-${Date.now()}-${nextId++}`;
}

export default function FieldLayout() {
  const [designObstacles, setDesignObstacles] = useState<Obstacle[]>([...CPPS_FIELD_LAYOUT]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

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
              Current CPPS Layout
            </TabsTrigger>
            <TabsTrigger value="designer" className="gap-2 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
              <PenTool className="h-4 w-4" />
              Design Your Own
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
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {Object.values(OBSTACLE_DEFINITIONS).map((def) => (
                    <div key={def.type} className="flex items-center gap-2 text-sm">
                      <div
                        className="w-4 h-4 rounded-sm flex-shrink-0"
                        style={{ backgroundColor: def.color }}
                      />
                      <span className="text-muted-foreground">{def.label}</span>
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
        </Tabs>
      </main>
    </div>
  );
}
