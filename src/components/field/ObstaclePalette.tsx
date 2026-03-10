import { OBSTACLE_DEFINITIONS, ObstacleType } from '@/types/fieldLayout';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface ObstaclePaletteProps {
  onAdd: (type: ObstacleType) => void;
}

export function ObstaclePalette({ onAdd }: ObstaclePaletteProps) {
  const types = Object.values(OBSTACLE_DEFINITIONS);

  return (
    <div className="grid grid-cols-3 gap-2">
      {types.map((def) => (
        <Button
          key={def.type}
          variant="outline"
          size="sm"
          onClick={() => onAdd(def.type)}
          className="h-auto py-2 px-2 flex flex-col items-center gap-1 text-xs border-border/50 hover:border-accent/50"
        >
          <div
            className="w-5 h-5 rounded-sm"
            style={{ backgroundColor: def.color }}
          />
          <span className="text-[10px] leading-tight text-center">{def.label}</span>
          <Plus className="w-3 h-3 text-muted-foreground" />
        </Button>
      ))}
    </div>
  );
}
