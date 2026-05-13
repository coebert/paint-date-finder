import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface FontResource {
  name: string;
  shortName: string;
  kind: 'stylesheet' | 'font';
  duration: number;
  transferSize: number;
  renderBlocking: 'blocking' | 'non-blocking' | 'unknown';
  startTime: number;
  hasDisplaySwap: boolean | null; // only meaningful for stylesheets
}

interface LoadedFontFace {
  family: string;
  style: string;
  weight: string;
  status: FontFaceLoadStatus;
  display: string;
}

interface FontReport {
  resources: FontResource[];
  loadedFonts: LoadedFontFace[];
  fontsReadyMs: number | null;
  totalBlockingMs: number;
  totalTransferKb: number;
  swapCoverage: { withSwap: number; total: number };
}

function shortenUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.host + u.pathname.replace(/^.*\//, '/…/');
  } catch {
    return url;
  }
}

function isFontResource(name: string): { ok: boolean; kind: 'stylesheet' | 'font' } {
  if (/fonts\.googleapis\.com\/css/i.test(name)) return { ok: true, kind: 'stylesheet' };
  if (/fonts\.gstatic\.com/i.test(name)) return { ok: true, kind: 'font' };
  if (/\.(woff2?|ttf|otf|eot)(\?|$)/i.test(name)) return { ok: true, kind: 'font' };
  return { ok: false, kind: 'font' };
}

function collectReport(): FontReport {
  const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
  const resources: FontResource[] = [];
  for (const e of entries) {
    const { ok, kind } = isFontResource(e.name);
    if (!ok) continue;
    const rb = (e as PerformanceResourceTiming & { renderBlockingStatus?: string }).renderBlockingStatus;
    let renderBlocking: FontResource['renderBlocking'] = 'unknown';
    if (rb === 'blocking') renderBlocking = 'blocking';
    else if (rb === 'non-blocking') renderBlocking = 'non-blocking';
    const hasDisplaySwap = kind === 'stylesheet' ? /[?&]display=swap\b/i.test(e.name) : null;
    resources.push({
      name: e.name,
      shortName: shortenUrl(e.name),
      kind,
      duration: e.duration,
      transferSize: e.transferSize ?? 0,
      renderBlocking,
      startTime: e.startTime,
      hasDisplaySwap,
    });
  }

  const loadedFonts: LoadedFontFace[] = [];
  if (typeof document !== 'undefined' && 'fonts' in document) {
    document.fonts.forEach((f) => {
      loadedFonts.push({
        family: f.family,
        style: f.style,
        weight: f.weight,
        status: f.status,
        display: f.display,
      });
    });
  }

  const totalBlockingMs = resources
    .filter((r) => r.renderBlocking === 'blocking')
    .reduce((s, r) => s + r.duration, 0);
  const totalTransferKb = resources.reduce((s, r) => s + r.transferSize, 0) / 1024;

  const stylesheetsWithSwapInfo = resources.filter((r) => r.kind === 'stylesheet' && r.hasDisplaySwap !== null);
  const swapCoverage = {
    withSwap: stylesheetsWithSwapInfo.filter((r) => r.hasDisplaySwap).length,
    total: stylesheetsWithSwapInfo.length,
  };

  return {
    resources,
    loadedFonts,
    fontsReadyMs: (window as Window & { __fontsReadyMs?: number }).__fontsReadyMs ?? null,
    totalBlockingMs,
    totalTransferKb,
    swapCoverage,
  };
}

export function FontMetrics() {
  const [report, setReport] = useState<FontReport>(() => collectReport());

  useEffect(() => {
    // Capture document.fonts.ready latency once, exposed on window for cross-component reads.
    const w = window as Window & { __fontsReadyMs?: number };
    if (typeof document !== 'undefined' && 'fonts' in document && w.__fontsReadyMs == null) {
      const t0 = performance.now();
      document.fonts.ready.then(() => {
        w.__fontsReadyMs = Math.round(performance.now() - t0);
        setReport(collectReport());
      });
    }
    const id = setInterval(() => setReport(collectReport()), 2000);
    return () => clearInterval(id);
  }, []);

  const blockingRating: 'good' | 'needs-improvement' | 'poor' =
    report.totalBlockingMs <= 100 ? 'good' : report.totalBlockingMs <= 300 ? 'needs-improvement' : 'poor';
  const swapAllGood = report.swapCoverage.total > 0 && report.swapCoverage.withSwap === report.swapCoverage.total;
  const ratingVariant = (r: 'good' | 'needs-improvement' | 'poor') =>
    r === 'good' ? 'default' : r === 'needs-improvement' ? 'secondary' : 'destructive';

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="font-display tracking-wider text-sm">Render-blocking time</CardTitle>
              <Badge variant={ratingVariant(blockingRating)} className="capitalize">
                {blockingRating.replace('-', ' ')}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-display tracking-wider text-foreground">
              {report.totalBlockingMs.toFixed(0)} ms
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Sum of duration for font/CSS resources marked render-blocking. Target ≤ 100 ms.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="font-display tracking-wider text-sm">font-display: swap</CardTitle>
              <Badge variant={swapAllGood ? 'default' : 'destructive'}>
                {swapAllGood ? 'OK' : 'Missing'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-display tracking-wider text-foreground">
              {report.swapCoverage.withSwap}/{report.swapCoverage.total || 0}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Google Fonts stylesheets including <code>display=swap</code>. Prevents FOIT.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="font-display tracking-wider text-sm">document.fonts.ready</CardTitle>
              <Badge variant="outline">Timing</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-display tracking-wider text-foreground">
              {report.fontsReadyMs == null ? '—' : `${report.fontsReadyMs} ms`}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Time from this page's mount until all declared fonts finished loading.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-display tracking-wider text-sm">
            Font resources ({report.resources.length}) · {report.totalTransferKb.toFixed(1)} KB transferred
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {report.resources.length === 0 ? (
            <p className="text-muted-foreground">No font/CSS resources detected on this navigation.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-muted-foreground border-b border-border">
                    <th className="py-2 pr-3">Resource</th>
                    <th className="py-2 pr-3">Kind</th>
                    <th className="py-2 pr-3">Duration</th>
                    <th className="py-2 pr-3">Size</th>
                    <th className="py-2 pr-3">Render</th>
                    <th className="py-2 pr-3">swap</th>
                  </tr>
                </thead>
                <tbody>
                  {report.resources.map((r) => (
                    <tr key={r.name + r.startTime} className="border-b border-border/50">
                      <td className="py-1.5 pr-3 font-mono text-foreground/90 break-all">{r.shortName}</td>
                      <td className="py-1.5 pr-3 capitalize">{r.kind}</td>
                      <td className="py-1.5 pr-3">{r.duration.toFixed(0)} ms</td>
                      <td className="py-1.5 pr-3">{r.transferSize ? `${(r.transferSize / 1024).toFixed(1)} KB` : '—'}</td>
                      <td className="py-1.5 pr-3">
                        <Badge
                          variant={
                            r.renderBlocking === 'blocking'
                              ? 'destructive'
                              : r.renderBlocking === 'non-blocking'
                                ? 'default'
                                : 'outline'
                          }
                          className="text-[10px]"
                        >
                          {r.renderBlocking}
                        </Badge>
                      </td>
                      <td className="py-1.5 pr-3">
                        {r.hasDisplaySwap === null ? '—' : r.hasDisplaySwap ? '✓' : '✗'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-display tracking-wider text-sm">
            FontFace registry ({report.loadedFonts.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {report.loadedFonts.length === 0 ? (
            <p className="text-muted-foreground">No FontFace entries registered yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-muted-foreground border-b border-border">
                    <th className="py-2 pr-3">Family</th>
                    <th className="py-2 pr-3">Weight</th>
                    <th className="py-2 pr-3">Style</th>
                    <th className="py-2 pr-3">display</th>
                    <th className="py-2 pr-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {report.loadedFonts.map((f, i) => (
                    <tr key={`${f.family}-${f.weight}-${f.style}-${i}`} className="border-b border-border/50">
                      <td className="py-1.5 pr-3 text-foreground/90">{f.family}</td>
                      <td className="py-1.5 pr-3">{f.weight}</td>
                      <td className="py-1.5 pr-3">{f.style}</td>
                      <td className="py-1.5 pr-3">
                        <Badge
                          variant={f.display === 'swap' || f.display === 'auto' ? 'default' : 'secondary'}
                          className="text-[10px]"
                        >
                          {f.display}
                        </Badge>
                      </td>
                      <td className="py-1.5 pr-3">
                        <Badge
                          variant={f.status === 'loaded' ? 'default' : f.status === 'error' ? 'destructive' : 'outline'}
                          className="text-[10px] capitalize"
                        >
                          {f.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
