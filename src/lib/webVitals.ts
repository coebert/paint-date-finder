import { onCLS, onLCP, onINP, onFCP, onTTFB, type Metric } from 'web-vitals';

type VitalsRecord = Record<string, Metric>;

declare global {
  interface Window {
    __webVitals?: VitalsRecord;
  }
}

/**
 * Initialise Core Web Vitals reporting.
 * - Logs each metric to the console with a clear prefix.
 * - Stores the latest value of each metric on `window.__webVitals` so you can
 *   inspect them from DevTools (e.g. `__webVitals.LCP.value`).
 *
 * Usage in DevTools after the page settles (LCP/CLS are finalised on
 * page hide / tab switch):
 *   Object.values(__webVitals).map(m => `${m.name}: ${m.value.toFixed(2)} (${m.rating})`)
 */
export function initWebVitals() {
  if (typeof window === 'undefined') return;

  const store: VitalsRecord = (window.__webVitals = window.__webVitals || {});

  const report = (metric: Metric) => {
    store[metric.name] = metric;
    // eslint-disable-next-line no-console
    console.info(
      `[web-vitals] ${metric.name} = ${metric.value.toFixed(2)} (${metric.rating})`,
      metric,
    );
  };

  onCLS(report);
  onLCP(report);
  onINP(report);
  onFCP(report);
  onTTFB(report);
}
