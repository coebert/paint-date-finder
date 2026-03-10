import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { FolderOpen, Search, User, Calendar, Layers } from 'lucide-react';
import { useFieldLayouts, FieldLayout } from '@/hooks/useFieldLayouts';
import { Obstacle } from '@/types/fieldLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

interface CommunityLayoutsDialogProps {
  onLoad: (obstacles: Obstacle[]) => void;
}

export function CommunityLayoutsDialog({ onLoad }: CommunityLayoutsDialogProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { data: layouts, isLoading } = useFieldLayouts();

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
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
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
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm truncate">{layout.name}</h3>
                    {layout.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{layout.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground flex-wrap">
                      {layout.author_name && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" /> {layout.author_name}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Layers className="w-3 h-3" /> {layout.obstacle_count} obstacles
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {format(new Date(layout.created_at), 'dd MMM yyyy')}
                      </span>
                    </div>
                    {layout.tags.length > 0 && (
                      <div className="flex gap-1 mt-2 flex-wrap">
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
