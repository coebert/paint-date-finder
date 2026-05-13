import { AdminLayout } from '@/layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const SAMPLE = 'Find A Walk-On — UK Paintball, .68 cal, Mag-Fed';
const PANGRAM = 'The quick brown fox jumps over the lazy dog 0123456789';

const INTER_WEIGHTS = [
  { weight: 400, label: 'Regular' },
  { weight: 500, label: 'Medium' },
  { weight: 600, label: 'Semibold' },
  { weight: 700, label: 'Bold' },
];

const HEADINGS: { tag: keyof JSX.IntrinsicElements; classes: string; label: string }[] = [
  { tag: 'h1', classes: 'text-5xl md:text-6xl font-display tracking-wider', label: 'H1 · Page hero' },
  { tag: 'h2', classes: 'text-3xl md:text-4xl font-display tracking-wider', label: 'H2 · Section title' },
  { tag: 'h3', classes: 'text-2xl font-display tracking-wider', label: 'H3 · Card title' },
  { tag: 'h4', classes: 'text-xl font-semibold', label: 'H4 · Sub-section (Inter Semibold)' },
  { tag: 'h5', classes: 'text-base font-semibold uppercase tracking-wider', label: 'H5 · Eyebrow (Inter Semibold)' },
];

const BODY_SIZES = [
  { classes: 'text-base', label: 'Body — text-base / 16px' },
  { classes: 'text-sm', label: 'Small — text-sm / 14px' },
  { classes: 'text-xs', label: 'Caption — text-xs / 12px' },
  { classes: 'text-lg leading-relaxed', label: 'Lead — text-lg / 18px relaxed' },
];

export default function AdminTypography() {
  return (
    <AdminLayout
      title="Typography QA"
      description="Preview every font family, weight, heading and body style used across Find A Walk-On."
    >
      <div className="space-y-6">
        {/* Token reference */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display tracking-wider text-sm">Font tokens</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 text-sm">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">font-display</Badge>
                <code className="text-xs text-muted-foreground">Bebas Neue → Impact → sans-serif</code>
              </div>
              <p className="font-display text-3xl tracking-wider">{SAMPLE}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">font-sans (default)</Badge>
                <code className="text-xs text-muted-foreground">Inter → system-ui → sans-serif</code>
              </div>
              <p className="font-sans text-xl">{SAMPLE}</p>
            </div>
          </CardContent>
        </Card>

        {/* Display weights — Bebas Neue ships only one weight, so show sizes instead */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display tracking-wider text-sm">Bebas Neue · display sizes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { size: 'text-7xl', label: '7xl / 72px' },
              { size: 'text-5xl', label: '5xl / 48px' },
              { size: 'text-3xl', label: '3xl / 30px' },
              { size: 'text-xl', label: 'xl / 20px' },
            ].map(({ size, label }) => (
              <div key={size} className="flex items-baseline justify-between gap-4 border-b border-border/40 pb-3 last:border-0">
                <p className={`font-display tracking-wider ${size}`}>{SAMPLE}</p>
                <code className="text-xs text-muted-foreground shrink-0">{label}</code>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Inter weights */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display tracking-wider text-sm">Inter · weights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {INTER_WEIGHTS.map(({ weight, label }) => (
              <div
                key={weight}
                className="flex flex-col md:flex-row md:items-baseline md:justify-between gap-1 border-b border-border/40 pb-3 last:border-0"
              >
                <p className="font-sans text-xl" style={{ fontWeight: weight }}>
                  {PANGRAM}
                </p>
                <code className="text-xs text-muted-foreground shrink-0">
                  {weight} · {label}
                </code>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Heading scale */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display tracking-wider text-sm">Heading scale</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {HEADINGS.map(({ tag: Tag, classes, label }) => (
              <div key={String(tag)} className="border-b border-border/40 pb-4 last:border-0">
                <p className="text-xs text-muted-foreground mb-1">
                  {label} · <code>{`<${String(Tag)}>`}</code> · <code>{classes}</code>
                </p>
                <Tag className={classes}>{SAMPLE}</Tag>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Body scale */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display tracking-wider text-sm">Body scale</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {BODY_SIZES.map(({ classes, label }) => (
              <div key={classes} className="border-b border-border/40 pb-3 last:border-0">
                <p className="text-xs text-muted-foreground mb-1">
                  {label} · <code>{classes}</code>
                </p>
                <p className={classes}>
                  Find walk-on paintball events across the United Kingdom — browse upcoming dates,
                  venues and event types on a map, calendar or list. {PANGRAM}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Color × text combinations */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display tracking-wider text-sm">Text on surfaces</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {[
              { bg: 'bg-background', fg: 'text-foreground', label: 'background / foreground' },
              { bg: 'bg-card', fg: 'text-card-foreground', label: 'card / card-foreground' },
              { bg: 'bg-muted', fg: 'text-muted-foreground', label: 'muted / muted-foreground' },
              { bg: 'bg-primary', fg: 'text-primary-foreground', label: 'primary / primary-foreground' },
              { bg: 'bg-secondary', fg: 'text-secondary-foreground', label: 'secondary / secondary-foreground' },
              { bg: 'bg-accent', fg: 'text-accent-foreground', label: 'accent / accent-foreground' },
            ].map(({ bg, fg, label }) => (
              <div key={label} className={`${bg} ${fg} rounded-md border border-border p-4`}>
                <p className="font-display tracking-wider text-2xl mb-1">Heading</p>
                <p className="text-sm opacity-90">Body — {SAMPLE}</p>
                <p className="text-[10px] mt-2 opacity-70">{label}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Inline elements */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display tracking-wider text-sm">Inline elements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-base">
            <p>
              Regular body with <strong>bold</strong>, <em>italic</em>, <u>underline</u>,{' '}
              <code className="text-foreground bg-muted px-1 rounded">inline code</code>, and an{' '}
              <a href="#" className="text-primary underline-offset-2 hover:underline">
                inline link
              </a>
              .
            </p>
            <p className="text-muted-foreground">Muted helper text used for descriptions and metadata.</p>
            <ul className="list-disc pl-6 text-sm space-y-1">
              <li>Unordered list item</li>
              <li>Second item with a longer description that wraps to verify line height</li>
            </ul>
            <ol className="list-decimal pl-6 text-sm space-y-1">
              <li>Ordered list item</li>
              <li>Second numbered item</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
