import { ImageWithSkeleton } from '@/components/ImageWithSkeleton';
import { useState } from 'react';
import { AdminLayout } from "@/layouts/AdminLayout";
import { useTeams, useTeamDivisions, Team } from '@/hooks/useTeams';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AlertCircle, Edit, Search, Users, Trophy, Globe, Mail } from 'lucide-react';
import { TeamEditDialog } from '@/components/TeamEditDialog';

export default function AdminTeams() {
  const [searchQuery, setSearchQuery] = useState('');
  const [divisionFilter, setDivisionFilter] = useState('');
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const { data: divisions = [] } = useTeamDivisions();
  const { data: teams, isLoading, error } = useTeams({
    division: divisionFilter || undefined,
    search: searchQuery || undefined,
    includeContact: true,
  });

  const handleEdit = (team: Team) => {
    setEditingTeam(team);
    setEditDialogOpen(true);
  };

  // Count filled fields for completeness indicator
  const getCompleteness = (team: Team) => {
    const fields = [team.captain_name, team.contact_email, team.website, team.logo_url, team.region, team.description];
    return fields.filter(Boolean).length;
  };

  if (isLoading) {
    return (
      <AdminLayout title="MANAGE TEAMS" description="Edit team details, captains, and logos">
        <Skeleton className="h-[500px] bg-card" />
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout title="MANAGE TEAMS" description="Edit team details, captains, and logos">
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-6 text-center">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
          <p className="text-destructive font-medium">Failed to load teams</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="MANAGE TEAMS" description="Edit team details, captains, and logos">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search teams..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-secondary/50"
          />
        </div>
        <Select value={divisionFilter} onValueChange={(v) => setDivisionFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="All Divisions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Divisions</SelectItem>
            {divisions.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Teams Table */}
      <Card className="bg-card border-border/50">
        <CardContent className="p-0">
          {!teams || teams.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium text-foreground">No teams found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead>Team</TableHead>
                    <TableHead>Division</TableHead>
                    <TableHead>Captain</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Completeness</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teams.map((team) => {
                    const completeness = getCompleteness(team);
                    return (
                      <TableRow key={team.id} className="border-border/50">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="relative w-8 h-8 rounded bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0">
                              {team.logo_url ? (
                                <ImageWithSkeleton src={team.logo_url} alt="" className="w-full h-full object-contain" />
                              ) : (
                                <Users className="w-4 h-4 text-muted-foreground" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium">{team.name}</p>
                              {team.points > 0 && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Trophy className="w-3 h-3" /> {team.points} pts
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{team.division}</Badge>
                          {team.position && (
                            <span className="text-xs text-muted-foreground ml-1">#{team.position}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className={team.captain_name ? 'text-foreground' : 'text-muted-foreground italic'}>
                            {team.captain_name || 'Not set'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {team.contact_email && <Mail className="w-3 h-3 text-accent" />}
                            {team.website && <Globe className="w-3 h-3 text-accent" />}
                            {!team.contact_email && !team.website && (
                              <span className="text-muted-foreground italic text-xs">None</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-secondary rounded-full overflow-hidden">
                              <div
                                className="h-full bg-accent rounded-full transition-all"
                                style={{ width: `${(completeness / 6) * 100}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">{completeness}/6</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(team)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="text-sm text-muted-foreground mt-4">
        Showing {teams?.length || 0} teams
      </div>

      <TeamEditDialog
        team={editingTeam}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />
    </AdminLayout>
  );
}
