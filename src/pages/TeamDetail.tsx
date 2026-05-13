import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useTeamById, useTeamRoster } from '@/hooks/useTeamDetail';
import { useEvents } from '@/hooks/useEvents';
import { format } from 'date-fns';
import {
  ArrowLeft, Users, Trophy, Mail, Globe, Phone, MapPin,
  Facebook, Instagram, Calendar, ExternalLink, Shield, Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { EventTypeBadge } from '@/components/EventTypeBadge';

const divisionColors: Record<string, string> = {
  'Elite': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  'Division 2': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'Division 3': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  'Division 4': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'Division 5': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  'Breakout': 'bg-rose-500/20 text-rose-400 border-rose-500/30',
};

export default function TeamDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: team, isLoading } = useTeamById(id);
  const { data: roster = [] } = useTeamRoster(id);

  // Get CPPS/tournament events (competitions & tournaments)
  const { data: allEvents = [] } = useEvents({});
  const upcomingEvents = allEvents.filter(e => {
    const eventDate = new Date(e.event_date);
    const now = new Date();
    return eventDate >= now && (
      e.event_type === 'competition' || e.event_type === 'tournament'
    );
  }).slice(0, 6);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6">
          <Skeleton className="h-64 w-full bg-card" />
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-display text-foreground mb-2">Team not found</h2>
          <Button asChild variant="outline">
            <Link to="/teams">Back to Teams</Link>
          </Button>
        </div>
      </div>
    );
  }

  const social = (team.social_media || {}) as Record<string, string>;

  return (
    <>
      <Helmet>
        <title>{`${team.name} | UK Paintball Team | Find A Walk-On`}</title>
        <meta name="description" content={`${team.name} — ${team.division ?? 'paintball team'} profile, roster and upcoming events on Find A Walk-On.`} />
        <link rel="canonical" href={`https://findawalkon.com/teams/${team.id}`} />
        <meta property="og:title" content={`${team.name} | UK Paintball Team`} />
        <meta property="og:description" content={`${team.name} team profile, roster and upcoming events.`} />
        <meta property="og:url" content={`https://findawalkon.com/teams/${team.id}`} />
        <meta property="og:type" content="profile" />
        {team.logo_url ? <meta property="og:image" content={team.logo_url} /> : null}
      </Helmet>
    <div className="min-h-screen bg-background">
      {/* Hero Header */}
      <header className="tactical-gradient border-b border-border/50">
        <div className="container mx-auto px-4 py-6">
          <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground mb-4 -ml-2">
            <Link to="/teams">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Teams
            </Link>
          </Button>

          <div className="flex items-start gap-5">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-xl bg-secondary border border-border/50 flex items-center justify-center overflow-hidden flex-shrink-0">
              {team.logo_url ? (
                <img src={team.logo_url} alt={`${team.name} logo`} className="w-full h-full object-contain p-2" />
              ) : (
                <Users className="w-10 h-10 text-muted-foreground" />
              )}
            </div>

            <div className="flex-1">
              <h1 className="font-display text-3xl md:text-4xl tracking-wider text-foreground mb-2">
                {team.name.toUpperCase()}
              </h1>

              <div className="flex items-center gap-2 flex-wrap mb-3">
                <Badge variant="outline" className={divisionColors[team.division] || 'bg-muted text-muted-foreground'}>
                  {team.division}
                </Badge>
                {team.position && (
                  <Badge variant="secondary">
                    <Shield className="w-3 h-3 mr-1" />
                    Position #{team.position}
                  </Badge>
                )}
                {team.points > 0 && (
                  <Badge variant="secondary">
                    <Trophy className="w-3 h-3 mr-1" />
                    {team.points} pts
                  </Badge>
                )}
              </div>

              {team.region && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {team.region}
                </p>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* About */}
            {team.description && (
              <Card className="bg-card border-border/50">
                <CardHeader>
                  <CardTitle className="font-display tracking-wider text-lg">ABOUT</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">{team.description}</p>
                </CardContent>
              </Card>
            )}

            {/* Roster */}
            <Card className="bg-card border-border/50">
              <CardHeader>
                <CardTitle className="font-display tracking-wider text-lg">
                  ROSTER
                  {roster.length > 0 && (
                    <Badge variant="secondary" className="ml-2 text-xs font-normal">
                      {roster.length} players
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {roster.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-6">
                    Roster information not yet available
                  </p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {roster.map((player) => (
                      <div
                        key={player.id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border/30"
                      >
                        <div className="w-10 h-10 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0">
                          {player.player_number ? (
                            <span className="text-sm font-bold text-accent">#{player.player_number}</span>
                          ) : (
                            <Users className="w-4 h-4 text-accent" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-foreground flex items-center gap-1.5">
                            {player.player_name}
                            {player.is_captain && (
                              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                            )}
                          </p>
                          {player.role && (
                            <p className="text-xs text-muted-foreground">{player.role}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upcoming CPPS Events */}
            <Card className="bg-card border-border/50">
              <CardHeader>
                <CardTitle className="font-display tracking-wider text-lg">
                  UPCOMING CPPS EVENTS
                </CardTitle>
              </CardHeader>
              <CardContent>
                {upcomingEvents.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-6">
                    No upcoming tournament events scheduled
                  </p>
                ) : (
                  <div className="space-y-3">
                    {upcomingEvents.map((event) => (
                      <div
                        key={event.id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border/30"
                      >
                        <div className="w-12 h-12 rounded-lg bg-accent/10 border border-accent/20 flex flex-col items-center justify-center flex-shrink-0">
                          <span className="text-xs text-accent font-medium uppercase">
                            {format(new Date(event.event_date), 'MMM')}
                          </span>
                          <span className="text-lg font-bold text-foreground leading-none">
                            {format(new Date(event.event_date), 'd')}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">{event.title}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{event.venue_name}</span>
                            <EventTypeBadge type={event.event_type} />
                          </div>
                        </div>
                        {event.booking_url && (
                          <a
                            href={event.booking_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-accent hover:text-accent/80"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Card */}
            <Card className="bg-card border-border/50">
              <CardHeader>
                <CardTitle className="font-display tracking-wider text-lg">CONTACT</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {team.captain_name && (
                  <div className="flex items-center gap-3">
                    <Star className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Captain</p>
                      <p className="text-sm font-medium text-foreground">{team.captain_name}</p>
                    </div>
                  </div>
                )}


                {team.website && (
                  <a href={team.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 group">
                    <Globe className="w-4 h-4 text-accent flex-shrink-0" />
                    <span className="text-sm text-foreground group-hover:text-accent transition-colors truncate">
                      {team.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                    </span>
                  </a>
                )}

                {team.home_venue && (
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Home Venue</p>
                      <p className="text-sm font-medium text-foreground">{team.home_venue}</p>
                    </div>
                  </div>
                )}

                {!team.captain_name && !team.contact_email && !team.contact_phone && !team.website && (
                  <p className="text-sm text-muted-foreground text-center py-3">
                    No contact information available yet
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Social Links */}
            {(social.facebook || social.instagram) && (
              <Card className="bg-card border-border/50">
                <CardHeader>
                  <CardTitle className="font-display tracking-wider text-lg">SOCIAL</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {social.facebook && (
                    <a
                      href={social.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-2.5 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors group"
                    >
                      <Facebook className="w-5 h-5 text-blue-400" />
                      <span className="text-sm text-foreground group-hover:text-accent transition-colors">Facebook</span>
                    </a>
                  )}
                  {social.instagram && (
                    <a
                      href={social.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-2.5 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors group"
                    >
                      <Instagram className="w-5 h-5 text-pink-400" />
                      <span className="text-sm text-foreground group-hover:text-accent transition-colors">Instagram</span>
                    </a>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
    </>
  );
}
