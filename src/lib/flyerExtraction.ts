import { FlyerSignInRequired } from '@/lib/flyerUpload';
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
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new FlyerSignInRequired();

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
    throw await describeFlyerError(error);
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


/** Error carrying the HTTP status from the flyer reader (401 sign-in, 402 credits, 429 limit). */
export class FlyerHttpError extends Error {
  constructor(message: string, public readonly status: number | null) {
    super(message);
    this.name = 'FlyerHttpError';
  }
}

/** Turn a functions.invoke error into a clear, status-aware message. */
export async function describeFlyerError(error: unknown): Promise<FlyerHttpError> {
  const ctx = (error as { context?: unknown }).context;
  let status: number | null = null;
  let serverMsg: string | null = null;
  if (ctx && typeof (ctx as Response).status === 'number') {
    const res = ctx as Response;
    status = res.status;
    try {
      const body = await res.clone().json();
      if (body && typeof body.error === 'string') serverMsg = body.error;
    } catch { /* not JSON */ }
  } else if (ctx && typeof (ctx as { body?: unknown }).body === 'string') {
    try {
      const body = JSON.parse((ctx as { body: string }).body);
      if (typeof body?.error === 'string') serverMsg = body.error;
    } catch { /* ignore */ }
  }
  const fallback =
    status === 401 ? 'Please sign in to read a flyer automatically.'
    : status === 402 ? 'The flyer reader is temporarily unavailable (AI credits used up). Please enter the event manually.'
    : status === 429 ? 'Too many flyer reads right now. Please wait a while and try again.'
    : (error instanceof Error ? error.message : 'Flyer reading failed');
  return new FlyerHttpError(serverMsg ?? fallback, status);
}
