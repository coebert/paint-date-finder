import { OBSTACLE_DEFINITIONS, ObstacleType } from '@/types/fieldLayout';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface ObstaclePaletteProps {
  onAdd: (type: ObstacleType) => void;
}

export function ObstaclePalette({ onAdd }: ObstaclePaletteProps) {
  const types = Object.values(OBSTACLE_DEFINITIONS);

  return (
    <div className="grid grid-cols-2 gap-2">
      {types.map((def) => (
        <Button
          key={def.type}
          variant="outline"
          size="sm"
          onClick={() => onAdd(def.type)}
          className="h-auto py-2 px-2 flex flex-col items-center gap-1 text-xs border-border/50 hover:border-accent/50"
        >
          <div
            className="w-5 h-5"
            style={{
              backgroundColor: def.color,
              borderRadius: def.shape === 'circle' ? '50%' : def.shape === 'triangle' ? '2px' : '3px',
              clipPath: def.shape === 'triangle' ? 'polygon(50% 0%, 100% 100%, 0% 100%)' : undefined,
            }}
          />
          <span className="text-[10px] leading-tight text-center font-medium">{def.label}</span>
          <span className="text-[9px] text-muted-foreground">{def.widthM}×{def.depthM}m</span>
          <Plus className="w-3 h-3 text-muted-foreground" />
        </Button>
      ))}
    </div>
  );
}
