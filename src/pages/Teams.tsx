import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, ArrowLeft, Trophy, Mail, Globe, Phone, Users, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useTeams, useTeamDivisions, Team } from '@/hooks/useTeams';

const divisionColors: Record<string, string> = {
  'Elite': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  'Division 2': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'Division 3': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  'Division 4': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'Division 5': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  'Breakout': 'bg-rose-500/20 text-rose-400 border-rose-500/30',
};

function TeamCard({ team }: { team: Team }) {
  return (
    <Card className="bg-card border-border/50 hover:border-accent/30 transition-all duration-200 group">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Logo / placeholder */}
          <div className="w-16 h-16 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0 overflow-hidden border border-border/50">
            {team.logo_url ? (
              <img src={team.logo_url} alt={`${team.name} logo`} className="w-full h-full object-contain p-1" />
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
              {team.contact_email && (
                <a
                  href={`mailto:${team.contact_email}`}
                  className="text-xs text-accent hover:text-accent/80 flex items-center gap-1 transition-colors"
                >
                  <Mail className="w-3 h-3" />
                  Email
                </a>
              )}
              {team.website && (
                <a
                  href={team.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-accent hover:text-accent/80 flex items-center gap-1 transition-colors"
                >
                  <Globe className="w-3 h-3" />
                  Website
                </a>
              )}
              {team.contact_phone && (
                <a
                  href={`tel:${team.contact_phone}`}
                  className="text-xs text-accent hover:text-accent/80 flex items-center gap-1 transition-colors"
                >
                  <Phone className="w-3 h-3" />
                  Call
                </a>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Teams() {
  const [search, setSearch] = useState('');
  const [division, setDivision] = useState<string>('');
  const { data: divisions = [] } = useTeamDivisions();
  const { data: teams, isLoading } = useTeams({
    division: division || undefined,
    search: search || undefined,
  });

  // Group teams by division
  const groupedTeams = teams?.reduce<Record<string, Team[]>>((acc, team) => {
    if (!acc[team.division]) acc[team.division] = [];
    acc[team.division].push(team);
    return acc;
  }, {}) || {};

  const divisionOrder = ['Elite', 'Division 2', 'Division 3', 'Division 4', 'Division 5', 'Breakout'];
  const sortedDivisions = Object.keys(groupedTeams).sort((a, b) => {
    const ai = divisionOrder.indexOf(a);
    const bi = divisionOrder.indexOf(b);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="tactical-gradient border-b border-border/50">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-4">
            <Button variant="ghost" size="icon" asChild className="text-muted-foreground hover:text-foreground">
              <Link to="/">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <div>
              <h1 className="font-display text-3xl md:text-4xl tracking-wider text-foreground">
                FIND A TEAM
              </h1>
              <p className="text-sm text-muted-foreground">
                CPPS registered paintball teams across the UK
              </p>
            </div>
          </div>

          {/* Filters */}
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
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-8">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full bg-card" />
            ))}
          </div>
        ) : teams && teams.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-lg">No teams found</p>
            <p className="text-sm">Try adjusting your search or filters</p>
          </div>
        ) : (
          sortedDivisions.map((div) => (
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
          ))
        )}

        {teams && teams.length > 0 && (
          <div className="text-center text-muted-foreground text-sm py-4 border-t border-border/50">
            Showing {teams.length} teams across {sortedDivisions.length} divisions
            <br />
            <span className="text-xs">Data sourced from CPPS (okpb.co.uk)</span>
          </div>
        )}
      </main>
    </div>
  );
}
