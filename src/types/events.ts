export type EventType = 'walk_on' | 'big_game' | 'competition' | 'tournament' | 'speedball' | 'scenario' | 'mag_fed' | 'other';

export interface PaintballEvent {
  id: string;
  title: string;
  description: string | null;
  event_type: EventType;
  venue_name: string;
  venue_location: string | null;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  booking_url: string | null;
  image_url: string | null;
  price_info: string | null;
  is_verified: boolean;
  source_url: string | null;
  created_at: string;
  updated_at: string;
}

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  walk_on: 'Walk-On',
  big_game: 'Big Game',
  competition: 'Competition',
  tournament: 'Tournament',
  speedball: 'Speedball',
  scenario: 'Scenario',
  mag_fed: 'Mag-Fed',
  other: 'Other',
};

export const EVENT_TYPE_COLORS: Record<EventType, string> = {
  walk_on: 'event-badge-walk-on',
  big_game: 'event-badge-big-game',
  competition: 'event-badge-competition',
  tournament: 'event-badge-tournament',
  speedball: 'event-badge-speedball',
  scenario: 'event-badge-scenario',
  mag_fed: 'event-badge-mag-fed',
  other: 'event-badge-other',
};
