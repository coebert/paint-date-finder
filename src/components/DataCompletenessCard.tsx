import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useDataCompleteness } from '@/hooks/useAnalytics';
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldCheck, Link2, DollarSign, Clock, FileText, AlertTriangle } from 'lucide-react';

interface MetricRowProps {
  icon: React.ElementType;
  label: string;
  missing: number;
  total: number;
  variant?: 'warning' | 'default';
}

function MetricRow({ icon: Icon, label, missing, total, variant = 'default' }: MetricRowProps) {
  const complete = total - missing;
  const pct = total > 0 ? Math.round((complete / total) * 100) : 100;
  const isFullyComplete = missing === 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />
          <span>{label}</span>
        </div>
        <div className="flex items-center gap-2">
          {isFullyComplete ? (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-accent/15 text-accent border-0">
              Complete
            </Badge>
          ) : (
            <span className="text-xs font-medium text-foreground">
              {missing} missing
            </span>
          )}
        </div>
      </div>
      <Progress value={pct} className="h-1.5" />
    </div>
  );
}

export function DataCompletenessCard() {
  const { data, isLoading } = useDataCompleteness();

  if (isLoading) {
    return <Skeleton className="h-[320px] bg-card" />;
  }

  if (!data) return null;

  const fields = [
    { icon: Link2, label: 'Booking URLs', missing: data.missingBooking },
    { icon: DollarSign, label: 'Price Info', missing: data.missingPrice },
    { icon: Clock, label: 'Start Times', missing: data.missingStartTime },
    { icon: FileText, label: 'Descriptions', missing: data.missingDescription },
  ];

  const totalFields = fields.length * data.total;
  const totalMissing = fields.reduce((sum, f) => sum + f.missing, 0);
  const overallPct = totalFields > 0 ? Math.round(((totalFields - totalMissing) / totalFields) * 100) : 100;

  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-accent" />
            <div>
              <CardTitle className="font-display text-lg tracking-wide">Data Completeness</CardTitle>
              <CardDescription>{data.total} total events</CardDescription>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-foreground">{overallPct}%</div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Complete</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {fields.map(f => (
          <MetricRow
            key={f.label}
            icon={f.icon}
            label={f.label}
            missing={f.missing}
            total={data.total}
          />
        ))}

        {/* Verification status */}
        <div className="pt-2 border-t border-border/50">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Unverified Events</span>
            </div>
            <div className="flex items-center gap-2">
              {data.unverified === 0 ? (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-accent/15 text-accent border-0">
                  All verified
                </Badge>
              ) : (
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                  {data.unverified} unverified
                </Badge>
              )}
            </div>
          </div>
          <Progress
            value={data.total > 0 ? Math.round(((data.total - data.unverified) / data.total) * 100) : 100}
            className="h-1.5 mt-1.5"
          />
        </div>
      </CardContent>
    </Card>
  );
}
