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

export type FlyerTimings = {
  scrape?: number;
  gemini?: number;
  total?: number;
};

export type FlyerExtractionResult = {
  candidates: ExtractedCandidate[];
  total_extracted: number;
  timings?: FlyerTimings;
  resolved_via?: string;
};

export async function extractFlyer(
  input: FlyerInput,
  options?: { timeoutMs?: number },
): Promise<FlyerExtractionResult> {
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
  return data as FlyerExtractionResult;
}

// ---------------------------------------------------------------------------
// Adaptive ETA model: learns the real per-tab extraction time from past runs
// and persists it in localStorage. Falls back to FLYER_TIMEOUTS_MS / 3 when
// no samples have been recorded yet.
// ---------------------------------------------------------------------------

const ETA_STORAGE_KEY = 'flyer-eta-samples-v1';
const MAX_SAMPLES = 8;

type SampleStore = Partial<Record<FlyerInput['kind'], number[]>>;

function readSamples(): SampleStore {
  try {
    const raw = localStorage.getItem(ETA_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SampleStore) : {};
  } catch {
    return {};
  }
}

function writeSamples(s: SampleStore) {
  try {
    localStorage.setItem(ETA_STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* quota / private mode — ignore */
  }
}

/** Record a real elapsed time (ms) for a finished extraction. */
export function recordFlyerSample(kind: FlyerInput['kind'], elapsedMs: number) {
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) return;
  const store = readSamples();
  const arr = (store[kind] ?? []).concat(elapsedMs).slice(-MAX_SAMPLES);
  store[kind] = arr;
  writeSamples(store);
}

/** Returns the learned ETA for a given kind, in seconds. */
export function getFlyerEtaSeconds(
  kind: FlyerInput['kind'],
  fileSizeBytes?: number,
): number {
  const store = readSamples();
  const samples = store[kind] ?? [];

  // Default fallback: a third of the hard timeout, with a per-MB fudge for files.
  const fallback = (() => {
    const baseSec = Math.round(FLYER_TIMEOUTS_MS[kind] / 1000 / 3);
    if ((kind === 'image' || kind === 'pdf') && fileSizeBytes) {
      const mb = fileSizeBytes / 1024 / 1024;
      return Math.round(baseSec + mb * 3);
    }
    return baseSec;
  })();

  if (samples.length === 0) return fallback;

  // Weighted: median of recent samples (robust to one slow outlier).
  const sorted = [...samples].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  // Add 15% headroom so the bar tends to finish slightly early rather than overrun.
  return Math.max(2, Math.round((median * 1.15) / 1000));
}



export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
