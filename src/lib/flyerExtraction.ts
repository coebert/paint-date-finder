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

/** Thrown when extraction exceeds the client-side hard timeout. */
export class FlyerTimeoutError extends Error {
  constructor(public readonly timeoutMs: number) {
    super(`Extraction timed out after ${Math.round(timeoutMs / 1000)}s`);
    this.name = 'FlyerTimeoutError';
  }
}

/** Default hard timeouts (ms) per input kind. */
export const FLYER_TIMEOUTS_MS: Record<FlyerInput['kind'], number> = {
  image: 90_000,
  pdf: 120_000,
  text: 30_000,
  url: 60_000,
};

export async function extractFlyer(
  input: FlyerInput,
  options?: { timeoutMs?: number },
): Promise<{ candidates: ExtractedCandidate[]; total_extracted: number }> {
  const timeoutMs = options?.timeoutMs ?? FLYER_TIMEOUTS_MS[input.kind];

  const invocation = supabase.functions.invoke('extract-flyer-event', {
    body: input,
  });

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new FlyerTimeoutError(timeoutMs)), timeoutMs);
  });

  let result: Awaited<typeof invocation>;
  try {
    result = await Promise.race([invocation, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }

  const { data, error } = result;
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
