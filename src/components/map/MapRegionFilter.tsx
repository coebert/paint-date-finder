import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { UKRegion } from '@/lib/venueCoordinates';

const REGION_LABELS: Record<UKRegion, string> = {
  all: 'All UK',
  scotland: 'Scotland',
  north: 'North',
  midlands: 'Midlands',
  south: 'South',
  wales: 'Wales',
};

interface MapRegionFilterProps {
  selectedRegion: UKRegion;
  onRegionChange: (region: UKRegion) => void;
  venueCount: number;
  eventCount: number;
}

export function MapRegionFilter({
  selectedRegion,
  onRegionChange,
  venueCount,
  eventCount,
}: MapRegionFilterProps) {
  return (
    <div className="bg-card border border-border/50 rounded-lg p-4">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm font-medium text-muted-foreground">Region:</span>
        <ToggleGroup
          type="single"
          value={selectedRegion}
          onValueChange={(v) => v && onRegionChange(v as UKRegion)}
          className="flex-wrap"
        >
          {(Object.keys(REGION_LABELS) as UKRegion[]).map((region) => (
            <ToggleGroupItem
              key={region}
              value={region}
              aria-label={`Filter by ${REGION_LABELS[region]}`}
              className="data-[state=on]:bg-accent data-[state=on]:text-accent-foreground"
            >
              {REGION_LABELS[region]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <span className="ml-auto text-xs text-muted-foreground">
          {venueCount} venue{venueCount === 1 ? '' : 's'} · {eventCount} event
          {eventCount === 1 ? '' : 's'}
        </span>
      </div>
    </div>
  );
}
