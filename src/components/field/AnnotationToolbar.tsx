import { Button } from '@/components/ui/button';
import { MousePointer2, User, MoveRight, Pencil, Type, Trash2, Undo2 } from 'lucide-react';
import { AnnotationTool, TEAM_COLORS } from '@/types/annotations';

interface AnnotationToolbarProps {
  activeTool: AnnotationTool;
  onToolChange: (tool: AnnotationTool) => void;
  activeColor: string;
  onColorChange: (color: string) => void;
  playerNumber: number;
  onPlayerNumberChange: (n: number) => void;
  onUndo: () => void;
  onClearAll: () => void;
  annotationCount: number;
}

const TOOLS: { id: AnnotationTool; icon: typeof MousePointer2; label: string; shortLabel: string }[] = [
  { id: 'select', icon: MousePointer2, label: 'Select / Move', shortLabel: 'Select' },
  { id: 'player', icon: User, label: 'Player Marker', shortLabel: 'Player' },
  { id: 'arrow', icon: MoveRight, label: 'Arrow Path', shortLabel: 'Arrow' },
  { id: 'freehand', icon: Pencil, label: 'Freehand Draw', shortLabel: 'Draw' },
  { id: 'text', icon: Type, label: 'Text Label', shortLabel: 'Text' },
];

export function AnnotationToolbar({
  activeTool,
  onToolChange,
  activeColor,
  onColorChange,
  playerNumber,
  onPlayerNumberChange,
  onUndo,
  onClearAll,
  annotationCount,
}: AnnotationToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 p-2 bg-secondary/50 rounded-lg border border-border/50">
      {/* Tool buttons */}
      <div className="flex gap-1">
        {TOOLS.map(t => (
          <Button
            key={t.id}
            variant={activeTool === t.id ? 'default' : 'outline'}
            size="sm"
            className="h-8 gap-1 text-[10px] px-2"
            onClick={() => onToolChange(t.id)}
            title={t.label}
          >
            <t.icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.shortLabel}</span>
          </Button>
        ))}
      </div>

      {/* Separator */}
      <div className="w-px h-6 bg-border/50" />

      {/* Color swatches */}
      <div className="flex gap-1">
        {TEAM_COLORS.map(c => (
          <button
            key={c.value}
            className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
            style={{
              backgroundColor: c.value,
              borderColor: activeColor === c.value ? 'white' : 'transparent',
              transform: activeColor === c.value ? 'scale(1.15)' : undefined,
            }}
            onClick={() => onColorChange(c.value)}
            title={c.label}
          />
        ))}
      </div>

      {/* Player number selector - only when player tool is active */}
      {activeTool === 'player' && (
        <>
          <div className="w-px h-6 bg-border/50" />
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map(n => (
              <Button
                key={n}
                variant={playerNumber === n ? 'default' : 'outline'}
                size="sm"
                className="h-7 w-7 p-0 text-xs font-bold"
                onClick={() => onPlayerNumberChange(n)}
              >
                {n}
              </Button>
            ))}
          </div>
        </>
      )}

      {/* Separator */}
      <div className="w-px h-6 bg-border/50" />

      {/* Actions */}
      <div className="flex gap-1 ml-auto">
        <Button variant="outline" size="sm" className="h-8 gap-1 text-[10px] px-2" onClick={onUndo} disabled={annotationCount === 0}>
          <Undo2 className="w-3.5 h-3.5" /> Undo
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1 text-[10px] px-2 text-destructive hover:text-destructive"
          onClick={onClearAll}
          disabled={annotationCount === 0}
        >
          <Trash2 className="w-3.5 h-3.5" /> Clear
        </Button>
      </div>
    </div>
  );
}
