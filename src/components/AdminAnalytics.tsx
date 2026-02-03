import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useVisitStats, useVisitSummary } from '@/hooks/useAnalytics';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Users, Eye, TrendingUp, Calendar } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO } from 'date-fns';

function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon 
}: { 
  title: string; 
  value: number | string; 
  subtitle: string; 
  icon: React.ElementType;
}) {
  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-accent" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

export function AdminAnalytics() {
  const [period, setPeriod] = useState<'7' | '30' | '90'>('30');
  const { data: stats, isLoading: statsLoading } = useVisitStats(parseInt(period));
  const { data: summary, isLoading: summaryLoading } = useVisitSummary();

  const chartData = stats?.map(s => ({
    date: format(parseISO(s.visit_date), 'MMM d'),
    visitors: s.unique_visitors,
    visits: s.total_visits,
  })) || [];

  if (summaryLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-[120px] bg-card" />
          ))}
        </div>
        <Skeleton className="h-[400px] bg-card" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl tracking-wide text-foreground mb-2">USAGE ANALYTICS</h2>
        <p className="text-muted-foreground">Track visitor activity and engagement across the platform</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          title="Today's Visitors"
          value={summary?.today.uniqueVisitors || 0}
          subtitle={`${summary?.today.visits || 0} total page views`}
          icon={Users}
        />
        <StatCard
          title="This Week"
          value={summary?.week.uniqueVisitors || 0}
          subtitle={`${summary?.week.visits || 0} page views`}
          icon={TrendingUp}
        />
        <StatCard
          title="This Month"
          value={summary?.month.uniqueVisitors || 0}
          subtitle={`${summary?.month.visits || 0} page views`}
          icon={Calendar}
        />
        <StatCard
          title="Avg Daily Views"
          value={summary?.month.visits ? Math.round(summary.month.visits / 30) : 0}
          subtitle="Based on last 30 days"
          icon={Eye}
        />
      </div>

      {/* Charts */}
      <Card className="bg-card border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-display text-lg tracking-wide">Visitor Trends</CardTitle>
              <CardDescription>Unique visitors and page views over time</CardDescription>
            </div>
            <Tabs value={period} onValueChange={(v) => setPeriod(v as '7' | '30' | '90')}>
              <TabsList className="bg-secondary">
                <TabsTrigger value="7">7 days</TabsTrigger>
                <TabsTrigger value="30">30 days</TabsTrigger>
                <TabsTrigger value="90">90 days</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {statsLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : chartData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No data available for this period
            </div>
          ) : (
            <Tabs defaultValue="visitors" className="space-y-4">
              <TabsList className="bg-secondary">
                <TabsTrigger value="visitors">Unique Visitors</TabsTrigger>
                <TabsTrigger value="pageviews">Page Views</TabsTrigger>
              </TabsList>
              
              <TabsContent value="visitors" className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="date" 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      labelStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="visitors" 
                      stroke="hsl(var(--accent))" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--accent))' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </TabsContent>
              
              <TabsContent value="pageviews" className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="date" 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      labelStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                    <Bar 
                      dataKey="visits" 
                      fill="hsl(var(--accent))" 
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
