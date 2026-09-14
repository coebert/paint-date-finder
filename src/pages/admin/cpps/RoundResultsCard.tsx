import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTeams } from '@/hooks/useTeams';
import { useCppsRounds } from '@/hooks/useCppsRounds';
import { useCppsResults, CPPS_CURRENT_SEASON, cppsResultKeys } from '@/hooks/useCppsResults';
import { groupResultsByRound, seasonsFromRounds, sortDivisions } from '@/lib/cpps';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Plus, Trash2, Medal } from 'lucide-react';
import { toast } from 'sonner';

interface ResultRow {
  team_name: string;
  position: string;
  points: string;
  notes: string;
}

const EMPTY_ROW: ResultRow = { team_name: '', position: '', points: '', notes: '' };

export function RoundResultsCard() {
  const queryClient = useQueryClient();
  const { data: rounds } = useCppsRounds();
  const { data: teams } = useTeams({ league: 'CPPS' });
  const [season, setSeason] = useState<string>(CPPS_CURRENT_SEASON);
  const { data: results } = useCppsResults(season);

  const [round, setRound] = useState<string>('');
  const [division, setDivision] = useState<string>('');
  const [rows, setRows] = useState<ResultRow[]>([{ ...EMPTY_ROW }]);
  const [saving, setSaving] = useState(false);

  const seasons = useMemo(() => {
    const found = seasonsFromRounds(rounds ?? []);
    return found.includes(CPPS_CURRENT_SEASON) ? found : [CPPS_CURRENT_SEASON, ...found];
  }, [rounds]);
  const roundNumbers = useMemo(
    () =>
      (rounds ?? [])
        .filter((r) => r.season === season)
        .map((r) => r.round)
        .sort((a, b) => a - b),
    [rounds, season],
  );
  const divisions = useMemo(
    () => sortDivisions([...new Set((teams ?? []).map((t) => t.division))]),
    [teams],
  );
  const divisionTeams = useMemo(
    () => (teams ?? []).filter((t) => !division || t.division === division),
    [teams, division],
  );
  const resultsByRound = useMemo(() => groupResultsByRound(results ?? []), [results]);

  // Load any results already recorded for the chosen round + division.
  useEffect(() => {
    if (!round || !division) return;
    const existing = (resultsByRound.get(Number(round)) ?? []).filter(
      (r) => r.division === division,
    );
    setRows(
      existing.length > 0
        ? existing.map((r) => ({
            team_name: r.team_name,
            position: r.position?.toString() ?? '',
            points: r.points.toString(),
            notes: r.notes ?? '',
          }))
        : [{ ...EMPTY_ROW }],
    );
  }, [round, division, resultsByRound]);

  const setRow = (i: number, patch: Partial<ResultRow>) =>
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const handleSave = async () => {
    const roundNum = Number(round);
    if (!roundNum || !division) {
      toast.error('Pick a round and a division first');
      return;
    }
    const cleaned = rows.filter((r) => r.team_name.trim() !== '');
    if (cleaned.length === 0) {
      toast.error('Add at least one team result');
      return;
    }
    const seen = new Set<string>();
    for (const r of cleaned) {
      const key = r.team_name.trim().toLowerCase();
      if (seen.has(key)) {
        toast.error(`${r.team_name} appears twice`);
        return;
      }
      seen.add(key);
    }

    setSaving(true);
    try {
      // Replace the whole division block so edits and removals both apply.
      const { error: delError } = await supabase
        .from('cpps_round_results')
        .delete()
        .eq('season', season)
        .eq('round', roundNum)
        .eq('division', division);
      if (delError) throw delError;

      const payload = cleaned.map((r) => {
        const match = (teams ?? []).find(
          (t) => t.name.trim().toLowerCase() === r.team_name.trim().toLowerCase(),
        );
        return {
          season,
          round: roundNum,
          division,
          team_id: match?.id ?? null,
          team_name: r.team_name.trim(),
          position: r.position === '' ? null : Number(r.position),
          points: r.points === '' ? 0 : Number(r.points),
          notes: r.notes.trim() === '' ? null : r.notes.trim(),
        };
      });

      const { error } = await supabase.from('cpps_round_results').insert(payload);
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: cppsResultKeys.all });
      toast.success(
        `Saved ${payload.length} result${payload.length === 1 ? '' : 's'} for Round ${roundNum} — ${division}`,
      );
    } catch (err) {
      toast.error('Failed to save results: ' + (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="bg-card border-border/50">
      <CardHeader>
        <CardTitle className="font-display text-lg tracking-wide flex items-center gap-2">
          <Medal className="h-5 w-5" aria-hidden />
          Round results
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Record how each team finished in a round. Saving replaces the results already stored for
          that round and division.
        </p>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Season</Label>
            <Select
              value={season}
              onValueChange={(v) => {
                setSeason(v);
                setRound('');
              }}
            >
              <SelectTrigger aria-label="Choose a season">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {seasons.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Round</Label>
            <Select value={round} onValueChange={setRound}>
              <SelectTrigger aria-label="Choose a round">
                <SelectValue placeholder="Choose a round…" />
              </SelectTrigger>
              <SelectContent>
                {roundNumbers.map((r) => (
                  <SelectItem key={r} value={String(r)}>
                    Round {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Division</Label>
            <Select value={division} onValueChange={setDivision}>
              <SelectTrigger aria-label="Choose a division">
                <SelectValue placeholder="Choose a division…" />
              </SelectTrigger>
              <SelectContent>
                {divisions.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {round && division && (
          <div className="space-y-3">
            <div className="hidden sm:grid sm:grid-cols-[1fr_5rem_5rem_1fr_2.5rem] gap-2 text-xs uppercase tracking-wider text-muted-foreground">
              <span>Team</span>
              <span>Position</span>
              <span>Points</span>
              <span>Notes</span>
              <span />
            </div>
            {rows.map((r, i) => (
              <div
                key={i}
                className="grid gap-2 sm:grid-cols-[1fr_5rem_5rem_1fr_2.5rem] sm:items-center"
              >
                <Input
                  list="cpps-team-names"
                  value={r.team_name}
                  onChange={(e) => setRow(i, { team_name: e.target.value })}
                  placeholder="Team name"
                  aria-label={`Team ${i + 1}`}
                  maxLength={120}
                />
                <Input
                  type="number"
                  min={1}
                  max={200}
                  value={r.position}
                  onChange={(e) => setRow(i, { position: e.target.value })}
                  placeholder="1"
                  aria-label={`Position for team ${i + 1}`}
                />
                <Input
                  type="number"
                  min={0}
                  value={r.points}
                  onChange={(e) => setRow(i, { points: e.target.value })}
                  placeholder="0"
                  aria-label={`Points for team ${i + 1}`}
                />
                <Input
                  value={r.notes}
                  onChange={(e) => setRow(i, { notes: e.target.value })}
                  placeholder="Optional note"
                  aria-label={`Notes for team ${i + 1}`}
                  maxLength={200}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}
                  disabled={rows.length === 1}
                  aria-label={`Remove team ${i + 1}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <datalist id="cpps-team-names">
              {divisionTeams.map((t) => (
                <option key={t.id} value={t.name} />
              ))}
            </datalist>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRows((rs) => [...rs, { ...EMPTY_ROW }])}
              >
                <Plus className="h-4 w-4 mr-1" /> Add a team
              </Button>
              <Button type="button" onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save results
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
