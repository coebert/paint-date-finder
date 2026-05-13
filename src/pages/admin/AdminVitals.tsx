import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AdminLayout } from '@/layouts/AdminLayout';
import { RefreshCw, Activity, Type } from 'lucide-react';
import type { Metric } from 'web-vitals';
import { FontMetrics } from '@/components/admin/FontMetrics';

type MetricName = 'LCP' | 'CLS' | 'INP' | 'FCP' | 'TTFB';

const METRICS: { key: MetricName; label: string; unit: string; description: string; format: (v: number) => string }[] = [
  { key: 'LCP', label: 'Largest Contentful Paint', unit: 'ms', description: 'Time until the largest above-the-fold element renders. Target ≤ 2500 ms.', format: (v) => `${v.toFixed(0)} ms` },
  { key: 'CLS', label: 'Cumulative Layout Shift', unit: '', description: 'Visual stability score. Target ≤ 0.1.', format: (v) => v.toFixed(3) },
  { key: 'INP', label: 'Interaction to Next Paint', unit: 'ms', description: 'Worst input → paint latency. Target ≤ 200 ms.', format: (v) => `${v.toFixed(0)} ms` },
  { key: 'FCP', label: 'First Contentful Paint', unit: 'ms', description: 'First text/image painted. Target ≤ 1800 ms.', format: (v) => `${v.toFixed(0)} ms` },
  { key: 'TTFB', label: 'Time to First Byte', unit: 'ms', description: 'Server response time. Target ≤ 800 ms.', format: (v) => `${v.toFixed(0)} ms` },
];

const ratingVariant: Record<string, 'default' | 'secondary' | 'destructive'> = {
  good: 'default',
  'needs-improvement': 'secondary',
  poor: 'destructive',
};

export default function AdminVitals() {
  const [vitals, setVitals] = useState<Record<string, Metric>>(() => window.__webVitals || {});
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setVitals({ ...(window.__webVitals || {}) });
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const collected = Object.keys(vitals).length;

  return (
    <AdminLayout
      title="Web Vitals"
      description="Live Core Web Vitals from this browser session — values from window.__webVitals, refreshed every second."
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Activity className="h-4 w-4" />
            {collected} of {METRICS.length} metrics collected · last refresh #{tick}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              window.location.reload();
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Reload page to re-measure
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {METRICS.map(({ key, label, description, format }) => {
            const m = vitals[key];
            return (
              <Card key={key}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="font-display tracking-wider text-sm">
                      {key} · {label}
                    </CardTitle>
                    {m ? (
                      <Badge variant={ratingVariant[m.rating] ?? 'secondary'} className="capitalize">
                        {m.rating.replace('-', ' ')}
                      </Badge>
                    ) : (
                      <Badge variant="outline">Pending</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-display tracking-wider text-foreground">
                    {m ? format(m.value) : '—'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">{description}</p>
                  {m && (
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      Nav type: {m.navigationType} · id: {m.id.slice(0, 18)}…
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-display tracking-wider text-foreground">
            <Type className="h-4 w-4" />
            FONT PERFORMANCE
          </div>
          <FontMetrics />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="font-display tracking-wider text-sm">How this works</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              Values come from the <code className="text-foreground">web-vitals</code> library
              initialised in <code className="text-foreground">src/lib/webVitals.ts</code>. Each
              metric is stored on <code className="text-foreground">window.__webVitals</code> and
              also logged to the browser console.
            </p>
            <p>
              <strong className="text-foreground">CLS</strong> and{' '}
              <strong className="text-foreground">INP</strong> are session-cumulative — they only
              reach their final value after the page is hidden or interactions occur. Reload to
              start a fresh measurement.
            </p>
            <p>
              For an authoritative score, run Lighthouse against the published site rather than
              this preview — dev mode and HMR inflate LCP and FCP.
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
