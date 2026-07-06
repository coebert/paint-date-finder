export function MapLegend() {
  return (
    <div className="absolute bottom-2 left-2 bg-card/90 backdrop-blur-sm border border-border/50 rounded-lg p-3 shadow-lg max-w-[220px]">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
        Marker Legend
      </p>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span
            className="inline-block rounded-full flex-shrink-0"
            style={{
              width: 14,
              height: 14,
              background: '#d97706',
              opacity: 0.55,
              border: '2px solid #f4f1e8',
            }}
          />
          <span className="text-[11px] text-foreground">Competition / Tournament</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="inline-block rounded-full flex-shrink-0"
            style={{
              width: 14,
              height: 14,
              background: '#c2410c',
              opacity: 0.55,
              border: '2px solid #f4f1e8',
            }}
          />
          <span className="text-[11px] text-foreground">Big Game</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="inline-block rounded-full flex-shrink-0"
            style={{
              width: 12,
              height: 12,
              background: '#8a9a5b',
              opacity: 0.3,
              border: '2px solid #0f1408',
            }}
          />
          <span className="text-[11px] text-foreground">Walk-on / Scenario / Other</span>
        </div>
        <div className="flex items-center gap-2 pt-1 border-t border-border/40">
          <span
            className="inline-block rounded-full flex-shrink-0 border border-dashed"
            style={{ width: 14, height: 14, background: 'transparent', borderColor: '#f4f1e8' }}
          />
          <span className="text-[11px] text-muted-foreground">Hover to highlight</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center justify-center rounded-full flex-shrink-0 text-[8px] font-bold"
            style={{ width: 18, height: 18, background: '#a8a247', color: '#0f1408', opacity: 0.6 }}
          >
            N
          </span>
          <span className="text-[11px] text-muted-foreground">Cluster — click to zoom</span>
        </div>
      </div>
    </div>
  );
}
