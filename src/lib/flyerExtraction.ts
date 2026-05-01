import { supabase } from '@/integrations/supabase/client';

export type ExtractedCandidate = {
  title: string;
  description?: string | null;
  event_type:
    | 'walk_on'
    | 'big_game'
    | 'competition'
    | 'tournament'
    | 'speedball'
    | 'scenario'
    | 'mag_fed'
    | 'other';
  event_date: string;
  start_time?: string | null;
  end_time?: string | null;
  price_info?: string | null;
  booking_url?: string | null;
  venue_name?: string | null;
  venue_location?: string | null;
};

export type FlyerInput =
  | { kind: 'image'; data: string; sourceUrl?: string }
  | { kind: 'pdf'; data: string; sourceUrl?: string }
  | { kind: 'text'; text: string; sourceUrl?: string }
  | { kind: 'url'; sourceUrl: string };

export async function extractFlyer(
  input: FlyerInput,
): Promise<{ candidates: ExtractedCandidate[]; total_extracted: number }> {
  const { data, error } = await supabase.functions.invoke(
    'extract-flyer-event',
    { body: input },
  );
  if (error) {
    // Try to surface the JSON error message returned by the function.
    const ctx = (error as { context?: { body?: string } }).context;
    if (ctx?.body) {
      try {
        const parsed = JSON.parse(ctx.body);
        if (parsed?.error) throw new Error(parsed.error);
      } catch {
        /* ignore */
      }
    }
    throw error;
  }
  return data as { candidates: ExtractedCandidate[]; total_extracted: number };
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
