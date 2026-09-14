import { describe, expect, it } from 'vitest';
import {
  groupResultsByRound,
  indexResultsByTeam,
  lookupTeamRound,
  roundsWithResults,
  type CppsRoundResult,
} from '@/lib/cpps';

const make = (over: Partial<CppsRoundResult>): CppsRoundResult => ({
  id: Math.random().toString(36).slice(2),
  season: '2026',
  round: 1,
  division: 'Elite',
  team_id: null,
  team_name: 'Team A',
  position: 1,
  points: 10,
  notes: null,
  ...over,
});

describe('CPPS round results helpers', () => {
  const results = [
    make({ round: 1, team_name: 'Team A', position: 1, points: 10 }),
    make({ round: 1, team_name: 'Team B', position: 2, points: 7 }),
    make({ round: 3, team_name: 'team a', position: 4, points: 3 }),
    make({ round: 3, team_name: 'Team C', position: null, points: 5 }),
  ];

  it('indexes results by team name case-insensitively', () => {
    const index = indexResultsByTeam(results);
    expect(lookupTeamRound(index, 'TEAM A', 1)).toEqual({ position: 1, points: 10 });
    expect(lookupTeamRound(index, ' team a ', 3)).toEqual({ position: 4, points: 3 });
    expect(lookupTeamRound(index, 'Team B', 3)).toBeUndefined();
  });

  it('groups by round and sorts by position with unplaced teams last', () => {
    const byRound = groupResultsByRound(results);
    expect(byRound.get(1)?.map((r) => r.team_name)).toEqual(['Team A', 'Team B']);
    expect(byRound.get(3)?.map((r) => r.position)).toEqual([4, null]);
  });

  it('lists only rounds that have results, ascending', () => {
    expect(roundsWithResults(results)).toEqual([1, 3]);
    expect(roundsWithResults([])).toEqual([]);
  });
});
