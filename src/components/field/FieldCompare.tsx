import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tag } from 'lucide-react';
import { FieldCanvas, CALLOUT_PREFIX } from '@/components/field/FieldCanvas';
import { CPPS_FIELD_LAYOUT, Obstacle, OBSTACLE_DEFINITIONS } from '@/types/fieldLayout';
import { NXL_LAS_VEGAS_LAYOUT, NXL_WINDY_CITY_LAYOUT, NXL_WORLD_CUP_LAYOUT, NXL_PRESETS, NxlPresetId } from '@/data/nxlLayouts';
import { NXL_TAMPA_BAY_LAYOUT } from '@/types/fieldLayout';

type PresetKey = 'cpps' | NxlPresetId;

const LAYOUT_MAP: Record<PresetKey, Obstacle[]> = {
  cpps: CPPS_FIELD_LAYOUT,
  'nxl-tampa': NXL_TAMPA_BAY_LAYOUT,
  'nxl-vegas': NXL_LAS_VEGAS_LAYOUT,
  'nxl-windy': NXL_WINDY_CITY_LAYOUT,
  'nxl-worldcup': NXL_WORLD_CUP_LAYOUT,
};

const ALL_PRESETS: { id: PresetKey; label: string; shortLabel: string; title: string; badge: string }[] = [
  { id: 'cpps', label: 'CPPS 2025', shortLabel: 'CPPS 2025', title: 'CPPS COMPETITION FIELD', badge: '2025 Season' },
  ...NXL_PRESETS.map(p => ({ id: p.id as PresetKey, label: p.label, shortLabel: p.shortLabel, title: p.title, badge: p.badge })),
];

export function FieldCompare() {
  const [leftPreset, setLeftPreset] = useState<PresetKey>('cpps');
  const [rightPreset, setRightPreset] = useState<PresetKey>('nxl-tampa');
  const [showLabels, setShowLabels] = useState(false);

  const leftMeta = ALL_PRESETS.find(p => p.id === leftPreset)!;
  const rightMeta = ALL_PRESETS.find(p => p.id === rightPreset)!;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">
          Select a layout for each side to compare them head-to-head.
        </p>
        <Button
          variant={showLabels ? 'default' : 'outline'}
          size="sm"
          className="h-8 gap-1 text-xs"
          onClick={() => setShowLabels(v => !v)}
        >
          <Tag className="w-3.5 h-3.5" /> Callouts
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left side */}
        <ComparePanel
          preset={leftPreset}
          setPreset={setLeftPreset}
          meta={leftMeta}
          showLabels={showLabels}
        />

        {/* Right side */}
        <ComparePanel
          preset={rightPreset}
          setPreset={setRightPreset}
          meta={rightMeta}
          showLabels={showLabels}
        />
      </div>

      {/* Obstacle count comparison */}
      <Card className="bg-card border-border/50">
        <CardContent className="py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">{leftMeta.shortLabel}</p>
              <p className="text-2xl font-display tracking-wider text-foreground">
                {LAYOUT_MAP[leftPreset].length}
              </p>
              <p className="text-xs text-muted-foreground">obstacles</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">{rightMeta.shortLabel}</p>
              <p className="text-2xl font-display tracking-wider text-foreground">
                {LAYOUT_MAP[rightPreset].length}
              </p>
              <p className="text-xs text-muted-foreground">obstacles</p>
            </div>
          </div>

          {/* Obstacle type breakdown */}
          <div className="mt-4 pt-4 border-t border-border/50">
            <p className="text-xs font-medium text-foreground mb-3">OBSTACLE BREAKDOWN</p>
            <div className="space-y-1.5">
              {Object.values(OBSTACLE_DEFINITIONS).map(def => {
                const leftCount = LAYOUT_MAP[leftPreset].filter(o => o.type === def.type).length;
                const rightCount = LAYOUT_MAP[rightPreset].filter(o => o.type === def.type).length;
                if (leftCount === 0 && rightCount === 0) return null;
                return (
                  <div key={def.type} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-xs">
                    <div className="text-right">
                      <span className={`font-mono ${leftCount > rightCount ? 'text-accent font-bold' : leftCount < rightCount ? 'text-muted-foreground' : 'text-foreground'}`}>
                        {leftCount}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 min-w-[100px] justify-center">
                      <div
                        className="w-3 h-3 flex-shrink-0 rounded-sm"
                        style={{ backgroundColor: def.color }}
                      />
                      <span className="text-muted-foreground text-[11px]">{def.label}</span>
                    </div>
                    <div className="text-left">
                      <span className={`font-mono ${rightCount > leftCount ? 'text-accent font-bold' : rightCount < leftCount ? 'text-muted-foreground' : 'text-foreground'}`}>
                        {rightCount}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ComparePanel({
  preset,
  setPreset,
  meta,
  showLabels,
}: {
  preset: PresetKey;
  setPreset: (p: PresetKey) => void;
  meta: { title: string; badge: string; shortLabel: string };
  showLabels: boolean;
}) {
  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap gap-1.5 mb-3">
          {ALL_PRESETS.map(p => (
            <Button
              key={p.id}
              variant={preset === p.id ? 'default' : 'outline'}
              size="sm"
              className="text-[10px] h-7 px-2"
              onClick={() => setPreset(p.id)}
            >
              {p.shortLabel}
            </Button>
          ))}
        </div>
        <CardTitle className="font-display tracking-wider text-sm flex items-center gap-2">
          {meta.title}
          <Badge className="bg-accent text-accent-foreground text-[10px]">
            {meta.badge}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <FieldCanvas obstacles={LAYOUT_MAP[preset]} showLabels={showLabels} />
      </CardContent>
    </Card>
  );
}
