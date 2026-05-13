import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Search, ArrowLeft, Trophy, Globe, Users, Filter, Shield, Swords } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTeams, useTeamDivisions, Team } from '@/hooks/useTeams';

const divisionColors: Record<string, string> = {
  'Elite': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  'Division 2': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'Division 3': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  'Division 4': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'Division 5': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  'Breakout': 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  'Independent': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
};

function TeamCard({ team }: { team: Team }) {
  return (
    <Link to={`/teams/${team.id}`}>
    <Card className="bg-card border-border/50 hover:border-accent/30 transition-all duration-200 group cursor-pointer">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0 overflow-hidden border border-border/50">
            {team.logo_url ? (
              <img src={team.logo_url} alt={`${team.name} paintball team logo`} className="w-full h-full object-contain p-1" />
            ) : (
              <Users className="w-7 h-7 text-muted-foreground" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-display text-lg tracking-wide text-foreground truncate">
                {team.name}
              </h3>
              {team.position && (
                <span className="text-xs text-muted-foreground font-medium">
                  #{team.position}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap mb-2">
              <Badge variant="outline" className={divisionColors[team.division] || 'bg-muted text-muted-foreground'}>
                {team.division}
              </Badge>
              {team.points > 0 && (
                <Badge variant="secondary" className="gap-1">
                  <Trophy className="w-3 h-3" />
                  {team.points} pts
                </Badge>
              )}
              {team.region && (
                <span className="text-xs text-muted-foreground">{team.region}</span>
              )}
            </div>

            {team.captain_name && (
              <p className="text-sm text-muted-foreground mb-1">
                <span className="text-foreground/70">Captain:</span> {team.captain_name}
              </p>
            )}

            {team.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{team.description}</p>
            )}

            <div className="flex items-center gap-3 flex-wrap">
              {team.website && (
                <a href={team.website} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:text-accent/80 flex items-center gap-1 transition-colors" onClick={e => e.stopPropagation()}>
                  <Globe className="w-3 h-3" /> Website
                </a>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
    </Link>
  );
}

function TeamGrid({ teams, isLoading }: { teams: Team[] | undefined; isLoading: boolean }) {
  const divisionOrder = ['Elite', 'Division 2', 'Division 3', 'Division 4', 'Division 5', 'Breakout', 'Independent'];

  const groupedTeams = teams?.reduce<Record<string, Team[]>>((acc, team) => {
    if (!acc[team.division]) acc[team.division] = [];
    acc[team.division].push(team);
    return acc;
  }, {}) || {};

  const sortedDivisions = Object.keys(groupedTeams).sort((a, b) => {
    const ai = divisionOrder.indexOf(a);
    const bi = divisionOrder.indexOf(b);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full bg-card" />
        ))}
      </div>
    );
  }

  if (!teams || teams.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p className="text-lg">No teams found</p>
        <p className="text-sm">Try adjusting your search or filters</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {sortedDivisions.map((div) => (
        <section key={div}>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="font-display text-xl tracking-wider text-foreground">{div.toUpperCase()}</h2>
            <Badge variant="secondary" className="text-xs">
              {groupedTeams[div].length} teams
            </Badge>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {groupedTeams[div].map((team) => (
              <TeamCard key={team.id} team={team} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export default function Teams() {
  const [search, setSearch] = useState('');
  const [division, setDivision] = useState<string>('');
  const [activeTab, setActiveTab] = useState('cpps');
  const { data: divisions = [] } = useTeamDivisions();

  const { data: cppsTeams, isLoading: cppsLoading } = useTeams({
    league: 'CPPS',
    division: division || undefined,
    search: search || undefined,
  });

  const { data: otherTeams, isLoading: otherLoading } = useTeams({
    league: 'Other',
    search: search || undefined,
  });

  const teamsListJsonLd = useMemo(() => {
    const all = [...(cppsTeams ?? []), ...(otherTeams ?? [])].slice(0, 50);
    if (all.length === 0) return null;
    return {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'UK Paintball Teams',
      itemListElement: all.map((t, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: `https://findawalkon.com/teams/${t.id}`,
        name: t.name,
      })),
    };
  }, [cppsTeams, otherTeams]);

  return (
    <>
      <Helmet>
        <title>UK Paintball Teams Directory | Find A Walk-On</title>
        <meta name="description" content="Browse the UK paintball team directory — divisions, rosters, and CPPS-listed teams across the country." />
        <link rel="canonical" href="https://findawalkon.com/teams" />
        <meta property="og:title" content="UK Paintball Teams Directory" />
        <meta property="og:description" content="Browse the UK paintball team directory — divisions, rosters, and CPPS-listed teams." />
        <meta property="og:url" content="https://findawalkon.com/teams" />
        <meta property="og:type" content="website" />
        {teamsListJsonLd && (
          <script type="application/ld+json">{JSON.stringify(teamsListJsonLd)}</script>
        )}
      </Helmet>
    <div className="min-h-screen bg-background">
      <header className="tactical-gradient border-b border-border/50">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-4">
            <Button variant="ghost" size="icon" asChild aria-label="Back to home" className="text-muted-foreground hover:text-foreground">
              <Link to="/">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <div>
              <h1 className="font-display text-3xl md:text-4xl tracking-wider text-foreground">
                FIND A TEAM
              </h1>
              <p className="text-sm text-muted-foreground">
                Paintball teams across the UK
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search teams..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-secondary border-border"
              />
            </div>
            {activeTab === 'cpps' && (
              <Select value={division} onValueChange={(v) => setDivision(v === 'all' ? '' : v)}>
                <SelectTrigger className="w-full sm:w-48 bg-secondary border-border">
                  <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="All Divisions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Divisions</SelectItem>
                  {divisions.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <section
          aria-labelledby="teams-ai-summary-heading"
          data-ai-summary
          className="mb-6 rounded-lg border border-border/50 bg-secondary/40 p-4 text-sm text-muted-foreground"
        >
          <h2 id="teams-ai-summary-heading" className="text-base font-semibold text-foreground mb-1">
            About this directory
          </h2>
          <p>
            A directory of UK paintball teams, including the official CPPS League roster (synced
            from the league) and a community-maintained list of other active UK clubs and squads.
            Each team profile shows division, region and logo where available. Team contact details
            are protected to prevent spam.
          </p>
        </section>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-secondary border border-border/50">
            <TabsTrigger value="cpps" className="gap-2 data-[state=active]:bg-accent/20">
              <Shield className="w-4 h-4" />
              CPPS League
              {cppsTeams && (
                <Badge variant="secondary" className="ml-1 text-xs">{cppsTeams.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="other" className="gap-2 data-[state=active]:bg-accent/20">
              <Swords className="w-4 h-4" />
              Other UK Teams
              {otherTeams && (
                <Badge variant="secondary" className="ml-1 text-xs">{otherTeams.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="cpps">
            <TeamGrid teams={cppsTeams} isLoading={cppsLoading} />
            {cppsTeams && cppsTeams.length > 0 && (
              <div className="text-center text-muted-foreground text-sm py-4 border-t border-border/50 mt-8">
                Showing {cppsTeams.length} CPPS registered teams
                <br />
                <span className="text-xs">Data sourced from CPPS (okpb.co.uk)</span>
              </div>
            )}
          </TabsContent>

          <TabsContent value="other">
            <div className="mb-6 p-4 rounded-lg bg-secondary/50 border border-border/50">
              <p className="text-sm text-muted-foreground">
                UK paintball teams competing in other leagues, woodsball events, scenario games, and independent tournaments.
                These teams may compete in SPL, NSPL, NXL Europe, magfed events, and more.
              </p>
            </div>
            <TeamGrid teams={otherTeams} isLoading={otherLoading} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
    </>
  );
}
