import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useVisitStats, useVisitSummary, useEventTypeStats, useVenueStats, usePeakHoursStats } from '@/hooks/useAnalytics';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area 
} from 'recharts';
import { Users, Eye, TrendingUp, Calendar, MapPin, Tag, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO } from 'date-fns';

const EVENT_TYPE_COLORS: Record<string, string> = {
  walk_on: 'hsl(var(--chart-1))',
  big_game: 'hsl(var(--chart-2))',
  competition: 'hsl(var(--chart-3))',
  tournament: 'hsl(var(--chart-4))',
  speedball: 'hsl(var(--chart-5))',
  scenario: 'hsl(142 76% 36%)',
  mag_fed: 'hsl(280 65% 60%)',
  other: 'hsl(var(--muted-foreground))',
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  walk_on: 'Walk-On',
  big_game: 'Big Game',
  competition: 'Competition',
  tournament: 'Tournament',
  speedball: 'Speedball',
  scenario: 'Scenario',
  mag_fed: 'Mag-Fed',
  other: 'Other',
};

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
  const { data: eventTypeStats, isLoading: eventTypeLoading } = useEventTypeStats();
  const { data: venueStats, isLoading: venueLoading } = useVenueStats();
  const { data: peakHoursStats, isLoading: peakHoursLoading } = usePeakHoursStats();

  const chartData = stats?.map(s => ({
    date: format(parseISO(s.visit_date), 'MMM d'),
    visitors: s.unique_visitors,
    visits: s.total_visits,
  })) || [];

  const pieData = eventTypeStats?.map(e => ({
    name: EVENT_TYPE_LABELS[e.type] || e.type,
    value: e.count,
    fill: EVENT_TYPE_COLORS[e.type] || 'hsl(var(--muted-foreground))',
  })) || [];

  const totalEvents = eventTypeStats?.reduce((sum, e) => sum + e.count, 0) || 0;

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
          title="Total Events"
          value={totalEvents}
          subtitle={`Across ${venueStats?.length || 0} venues`}
          icon={Tag}
        />
      </div>

      {/* Visitor Trends Chart */}
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
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      labelStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                    <Line type="monotone" dataKey="visitors" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ fill: 'hsl(var(--accent))' }} />
                  </LineChart>
                </ResponsiveContainer>
              </TabsContent>
              
              <TabsContent value="pageviews" className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      labelStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                    <Bar dataKey="visits" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* Event Type & Venue Stats Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Event Type Popularity */}
        <Card className="bg-card border-border/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-accent" />
              <div>
                <CardTitle className="font-display text-lg tracking-wide">Event Type Popularity</CardTitle>
                <CardDescription>Distribution of events by type</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {eventTypeLoading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : pieData.length === 0 ? (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                No event data available
              </div>
            ) : (
              <div className="flex flex-col md:flex-row items-center gap-4">
                <div className="h-[200px] w-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2">
                  {eventTypeStats?.map(e => (
                    <div key={e.type} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-sm" 
                          style={{ backgroundColor: EVENT_TYPE_COLORS[e.type] || 'hsl(var(--muted-foreground))' }}
                        />
                        <span className="text-muted-foreground">{EVENT_TYPE_LABELS[e.type] || e.type}</span>
                      </div>
                      <span className="font-medium text-foreground">{e.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Venues */}
        <Card className="bg-card border-border/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-accent" />
              <div>
                <CardTitle className="font-display text-lg tracking-wide">Top Venues</CardTitle>
                <CardDescription>Venues with the most events</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {venueLoading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : venueStats?.length === 0 ? (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                No venue data available
              </div>
            ) : (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={venueStats} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis 
                      type="category" 
                      dataKey="venue" 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={11}
                      width={120}
                      tickFormatter={(value) => value.length > 18 ? `${value.slice(0, 18)}...` : value}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      labelStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                    <Bar dataKey="count" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Peak Usage Times */}
      <Card className="bg-card border-border/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-accent" />
            <div>
              <CardTitle className="font-display text-lg tracking-wide">Peak Usage Times</CardTitle>
              <CardDescription>Visitor activity by hour of day (UTC)</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {peakHoursLoading ? (
            <Skeleton className="h-[200px] w-full" />
          ) : (
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={peakHoursStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="hour" 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={11}
                    tickFormatter={(value) => value.replace(':00', '')}
                  />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                    formatter={(value: number) => [value, 'Visits']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="visits" 
                    stroke="hsl(var(--accent))" 
                    fill="hsl(var(--accent) / 0.3)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
