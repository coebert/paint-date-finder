import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { FolderOpen, Search, User, Calendar, Layers, Trash2 } from 'lucide-react';
import { useFieldLayouts, FieldLayout, useDeleteFieldLayout, getDeleteToken } from '@/hooks/useFieldLayouts';
import { Obstacle, OBSTACLE_DEFINITIONS } from '@/types/fieldLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { toast } from 'sonner';

// Lightweight 2D thumbnail of a layout
function LayoutThumbnail({ obstacles }: { obstacles: Obstacle[] }) {
  const w = 120;
  const h = 96;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full rounded" style={{ background: 'hsl(120, 35%, 20%)' }}>
      {/* Center line */}
      <line x1={w / 2} y1={0} x2={w / 2} y2={h} stroke="rgba(255,255,255,0.15)" strokeWidth={0.5} strokeDasharray="2,2" />
      {/* Boundary */}
      <rect x={1} y={1} width={w - 2} height={h - 2} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={0.8} rx={2} />
      {/* Obstacles */}
      {obstacles.map((obs, i) => {
        const def = OBSTACLE_DEFINITIONS[obs.type];
        if (!def) return null;
        const ox = (obs.x / 100) * w;
        const oy = (obs.y / 100) * h;
        const r = Math.max(2.5, ((def.widthM + def.depthM) / 2 / 45) * w);
        if (def.birdEye === 'triangle') {
          const s = r * 1.3;
          return (
            <polygon
              key={i}
              points={`${ox},${oy - s} ${ox + s * 0.87},${oy + s * 0.5} ${ox - s * 0.87},${oy + s * 0.5}`}
              fill={def.color}
              opacity={0.85}
              transform={`rotate(${obs.rotation || 0}, ${ox}, ${oy})`}
            />
          );
        }
        return (
          <circle key={i} cx={ox} cy={oy} r={r}
            fill={def.color} opacity={0.85} />
        );
      })}
    </svg>
  );
}

interface CommunityLayoutsDialogProps {
  onLoad: (obstacles: Obstacle[]) => void;
}

export function CommunityLayoutsDialog({ onLoad }: CommunityLayoutsDialogProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { data: layouts, isLoading } = useFieldLayouts();
  const deleteLayout = useDeleteFieldLayout();

  const filtered = (layouts ?? []).filter((l) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      l.name.toLowerCase().includes(q) ||
      l.description?.toLowerCase().includes(q) ||
      l.author_name?.toLowerCase().includes(q) ||
      l.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  const handleLoad = (layout: FieldLayout) => {
    onLoad(layout.obstacles);
    setOpen(false);
  };

  const handleDelete = (layout: FieldLayout) => {
    const token = getDeleteToken(layout.id);
    if (!token) return;
    if (!confirm(`Delete "${layout.name}"? This cannot be undone.`)) return;
    deleteLayout.mutate(
      { id: layout.id, token },
      {
        onSuccess: () => toast.success('Layout deleted'),
        onError: () => toast.error('Failed to delete layout'),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-xs gap-1">
          <FolderOpen className="w-3 h-3" /> Community
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display tracking-wider">COMMUNITY LAYOUTS</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search layouts..."
            className="pl-9"
          />
        </div>
        <div className="flex-1 overflow-y-auto space-y-3 min-h-0 pr-1">
          {isLoading && (
            <>
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
            </>
          )}
          {!isLoading && filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              {search ? 'No layouts match your search' : 'No community layouts yet. Be the first to save one!'}
            </p>
          )}
          {filtered.map((layout) => (
            <Card key={layout.id} className="bg-secondary/50 border-border/30 hover:border-accent/50 transition-colors">
              <CardContent className="py-3 px-4">
                <div className="flex items-start gap-3">
                  {/* Thumbnail */}
                  <div className="w-[100px] h-[80px] shrink-0 rounded border border-border/30 overflow-hidden">
                    <LayoutThumbnail obstacles={layout.obstacles} />
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm truncate">{layout.name}</h3>
                    {layout.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{layout.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground flex-wrap">
                      {layout.author_name && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" /> {layout.author_name}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Layers className="w-3 h-3" /> {layout.obstacle_count}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {format(new Date(layout.created_at), 'dd MMM yyyy')}
                      </span>
                    </div>
                    {layout.tags.length > 0 && (
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {layout.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">{tag}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button size="sm" className="text-xs shrink-0" onClick={() => handleLoad(layout)}>
                    Load
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
