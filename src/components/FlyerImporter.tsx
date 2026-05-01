import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Sparkles, Upload, ImageIcon, Link2, FileText, FileType, Check, X as XIcon, Circle, AlertTriangle, RotateCw, Clipboard } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  extractFlyer,
  fileToDataUrl,
  FlyerTimeoutError,
  FLYER_TIMEOUTS_MS,
  getFlyerEtaSeconds,
  recordFlyerSample,
  type ExtractedCandidate,
  type FlyerInput,
} from '@/lib/flyerExtraction';
import { EVENT_TYPE_LABELS, type EventType } from '@/types/events';

export interface FlyerImporterProps {
  /** Called once the user has reviewed candidates and clicks Save. */
  onSave: (
    candidates: (ExtractedCandidate & { _selected: true })[],
    sourceUrl: string | null,
    flyerImageUrl: string | null,
  ) => Promise<void> | void;
  /** Label for the save button. */
  saveLabel?: string;
  /** Disable the save button (e.g. mid-mutation). */
  saving?: boolean;
}

// Hard limits — files above these are rejected outright.
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB
const MAX_PDF_BYTES = 10 * 1024 * 1024; // 10 MB
// Soft warning thresholds — accepted, but we suggest compressing to avoid timeouts.
const WARN_IMAGE_BYTES = 4 * 1024 * 1024; // 4 MB
const WARN_PDF_BYTES = 5 * 1024 * 1024; // 5 MB
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ACCEPTED_PDF_TYPES = ['application/pdf'];

const formatMB = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

type EditableCandidate = ExtractedCandidate & {
  _id: string;
  _selected: boolean;
};

const DRAFT_STORAGE_KEY = 'flyer-importer-draft-v1';
const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
// If a mid-extraction marker is older than this, we assume the previous run
// crashed/was abandoned rather than is still legitimately running elsewhere.
const IN_PROGRESS_STALE_MS = 10 * 60 * 1000; // 10 minutes

type InProgressMark = {
  kind: 'image' | 'pdf' | 'text' | 'url';
  startedAt: number;
  // Helpful UI hints captured at start so we can describe the abandoned run
  hadFile?: boolean;
  fileName?: string;
};

type DraftV1 = {
  v: 1;
  savedAt: number;
  tab: 'image' | 'pdf' | 'text' | 'url';
  sourceUrl: string;
  pastedText: string;
  candidates: EditableCandidate[];
  inProgress?: InProgressMark | null;
};

function loadDraft(): DraftV1 | null {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DraftV1;
    if (parsed?.v !== 1) return null;
    if (!parsed.savedAt || Date.now() - parsed.savedAt > DRAFT_TTL_MS) {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function saveDraftPartial(patch: Partial<DraftV1>) {
  try {
    const existing = loadDraft();
    const merged: DraftV1 = {
      v: 1,
      savedAt: Date.now(),
      tab: patch.tab ?? existing?.tab ?? 'image',
      sourceUrl: patch.sourceUrl ?? existing?.sourceUrl ?? '',
      pastedText: patch.pastedText ?? existing?.pastedText ?? '',
      candidates: patch.candidates ?? existing?.candidates ?? [],
      inProgress:
        patch.inProgress === undefined ? existing?.inProgress ?? null : patch.inProgress,
    };
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(merged));
  } catch {
    /* quota / private mode — ignore */
  }
}

function clearInProgress() {
  try {
    const existing = loadDraft();
    if (!existing) return;
    if (existing.inProgress) {
      const next: DraftV1 = { ...existing, inProgress: null, savedAt: Date.now() };
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(next));
    }
  } catch {
    /* ignore */
  }
}

function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function FlyerImporter({ onSave, saveLabel = 'Save selected', saving }: FlyerImporterProps) {
  // Hydrate from a persisted draft on mount so the user can leave and come back.
  // Files (binary) cannot be persisted — but the source URL, pasted text, and
  // already-extracted candidates can, which is what avoids re-running extraction.
  const initialDraft = typeof window !== 'undefined' ? loadDraft() : null;

  const [tab, setTab] = useState<'image' | 'pdf' | 'text' | 'url'>(
    initialDraft?.tab ?? 'image',
  );
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pastedText, setPastedText] = useState(initialDraft?.pastedText ?? '');
  const [sourceUrl, setSourceUrl] = useState(initialDraft?.sourceUrl ?? '');
  const [extracting, setExtracting] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [estimate, setEstimate] = useState(0);
  const startRef = useRef<number>(0);
  const [candidates, setCandidates] = useState<EditableCandidate[]>(
    initialDraft?.candidates ?? [],
  );
  const [restoredAt] = useState<number | null>(
    initialDraft?.candidates?.length ? initialDraft.savedAt : null,
  );

  type StageKey = 'prepare' | 'upload' | 'analyse' | 'save';
  type StageStatus = 'pending' | 'active' | 'done' | 'failed';
  type StageState = {
    key: StageKey;
    label: string;
    status: StageStatus;
    note?: string;
    startedAt?: number;
    durationMs?: number;
  };
  const [stages, setStages] = useState<StageState[]>([]);
  const [failedStage, setFailedStage] = useState<StageKey | null>(null);
  // Tick to drive per-stage live elapsed display
  const [stageTick, setStageTick] = useState(0);
  // Soft-warning state: surfaced when extraction crosses ~70% of the hard timeout
  const [slowWarning, setSlowWarning] = useState(false);
  // Last failure details for the retry/fallback panel
  const [lastFailure, setLastFailure] = useState<{
    kind: FlyerInput['kind'];
    isTimeout: boolean;
    timeoutMs?: number;
    message: string;
    attempt: number;
  } | null>(null);
  const attemptRef = useRef(0);

  // Auto-resume: detect a previous run that started extraction but never
  // finished (no candidates set, in-progress marker present and not stale).
  const initialResume: InProgressMark | null = (() => {
    const ip = initialDraft?.inProgress;
    if (!ip) return null;
    if (initialDraft?.candidates && initialDraft.candidates.length > 0) return null;
    if (Date.now() - ip.startedAt > IN_PROGRESS_STALE_MS) return null;
    return ip;
  })();
  const [resumePrompt, setResumePrompt] = useState<InProgressMark | null>(initialResume);
  useEffect(() => {
    // Don't persist while extraction is in flight to avoid storing partial state.
    // (handleExtract writes its own in-progress marker explicitly.)
    if (extracting) return;
    try {
      // If everything is empty AND there's no in-progress marker to preserve,
      // just clear the draft.
      const existing = loadDraft();
      if (
        !sourceUrl &&
        !pastedText &&
        candidates.length === 0 &&
        !existing?.inProgress
      ) {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
        return;
      }
      saveDraftPartial({
        tab,
        sourceUrl,
        pastedText,
        candidates,
      });
    } catch {
      /* quota exceeded / private mode — silently ignore */
    }
  }, [tab, sourceUrl, pastedText, candidates, extracting]);

  const handleDiscardDraft = () => {
    setCandidates([]);
    setSourceUrl('');
    setPastedText('');
    setFile(null);
    setPreviewUrl(null);
    setResumePrompt(null);
    clearDraft();
    toast.success('Draft cleared');
  };

  const handleDismissResume = () => {
    setResumePrompt(null);
    clearInProgress();
  };

  const handleResumeExtraction = () => {
    if (!resumePrompt) return;
    // For image/PDF runs we cannot recover the original binary — the user
    // must re-select the file before we can resume. Switch to that tab and
    // surface a toast; the resume banner stays so they can click again.
    if ((resumePrompt.kind === 'image' || resumePrompt.kind === 'pdf') && !file) {
      setTab(resumePrompt.kind);
      toast.info(
        `Re-select your ${resumePrompt.kind.toUpperCase()}${resumePrompt.fileName ? ` (${resumePrompt.fileName})` : ''} to resume`,
        { description: 'Files can\'t be saved between sessions — pick the same file and we\'ll continue.' },
      );
      return;
    }
    setTab(resumePrompt.kind);
    setResumePrompt(null);
    // Defer so the tab switch + state updates settle before extraction starts.
    setTimeout(() => {
      void handleExtract();
    }, 0);
  };



  const buildStages = (kind: 'image' | 'pdf' | 'text' | 'url'): StageState[] => {
    if (kind === 'image') {
      return [
        { key: 'prepare', label: 'Prepare image', status: 'pending' },
        { key: 'upload', label: 'Upload to AI', status: 'pending' },
        { key: 'analyse', label: 'OCR & parse events', status: 'pending' },
        { key: 'save', label: 'Finalise results', status: 'pending' },
      ];
    }
    if (kind === 'pdf') {
      return [
        { key: 'prepare', label: 'Prepare PDF', status: 'pending' },
        { key: 'upload', label: 'Upload to AI', status: 'pending' },
        { key: 'analyse', label: 'Extract & parse pages', status: 'pending' },
        { key: 'save', label: 'Finalise results', status: 'pending' },
      ];
    }
    if (kind === 'url') {
      return [
        { key: 'prepare', label: 'Validate URL', status: 'pending' },
        { key: 'upload', label: 'Fetch page', status: 'pending' },
        { key: 'analyse', label: 'Parse events', status: 'pending' },
        { key: 'save', label: 'Finalise results', status: 'pending' },
      ];
    }
    return [
      { key: 'prepare', label: 'Prepare text', status: 'pending' },
      { key: 'upload', label: 'Send to AI', status: 'pending' },
      { key: 'analyse', label: 'Parse events', status: 'pending' },
      { key: 'save', label: 'Finalise results', status: 'pending' },
    ];
  };

  const setStage = (key: StageKey, status: StageStatus, note?: string) => {
    setStages((prev) =>
      prev.map((s) => {
        if (s.key !== key) return s;
        const next: StageState = { ...s, status, note: note ?? s.note };
        if (status === 'active' && !s.startedAt) {
          next.startedAt = Date.now();
        }
        if ((status === 'done' || status === 'failed') && s.startedAt && !s.durationMs) {
          next.durationMs = Date.now() - s.startedAt;
        }
        return next;
      }),
    );
  };

  // Tick elapsed seconds while extracting
  useEffect(() => {
    if (!extracting) return;
    const id = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
      setStageTick((t) => t + 1);
    }, 500);
    return () => window.clearInterval(id);
  }, [extracting]);

  // Adaptive ETA — uses real timings from past extractions when available,
  // falls back to a sensible per-tab default otherwise.
  const estimateSeconds = (
    kind: 'image' | 'pdf' | 'text' | 'url',
    f: File | null,
  ): number => getFlyerEtaSeconds(kind, f?.size);

  const formatTime = (s: number) => {
    if (s <= 0) return '0s';
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    const r = s % 60;
    return r ? `${m}m ${r}s` : `${m}m`;
  };

  const onFileChange = async (f: File | null, kind: 'image' | 'pdf') => {
    if (!f) {
      setFile(null);
      setPreviewUrl(null);
      return;
    }

    // MIME / extension check
    const accepted = kind === 'image' ? ACCEPTED_IMAGE_TYPES : ACCEPTED_PDF_TYPES;
    const okType =
      accepted.includes(f.type) ||
      (kind === 'pdf' && f.name.toLowerCase().endsWith('.pdf')) ||
      (kind === 'image' && /\.(jpe?g|png|webp)$/i.test(f.name));
    if (!okType) {
      toast.error(
        kind === 'image'
          ? 'Unsupported image type. Use JPG, PNG or WebP.'
          : 'Unsupported file. Please upload a PDF.',
      );
      return;
    }

    // Reject empty files
    if (f.size === 0) {
      toast.error('That file is empty. Please choose a different file.');
      return;
    }

    // Hard size limit — block upload entirely
    const limit = kind === 'image' ? MAX_IMAGE_BYTES : MAX_PDF_BYTES;
    if (f.size > limit) {
      const overBy = formatMB(f.size - limit);
      toast.error(`File too large (${formatMB(f.size)})`, {
        description:
          kind === 'image'
            ? `Max ${formatMB(limit)} — yours is ${overBy} over. Try compressing with TinyPNG/Squoosh, exporting at 1600px wide, or screenshotting just the flyer.`
            : `Max ${formatMB(limit)} — yours is ${overBy} over. Try compressing with iLovePDF/Smallpdf, or splitting out the flyer page only.`,
        duration: 8000,
      });
      return;
    }

    // Soft warning — accepted, but slow / timeout risk
    const warn = kind === 'image' ? WARN_IMAGE_BYTES : WARN_PDF_BYTES;
    if (f.size > warn) {
      toast.warning(`Large ${kind} (${formatMB(f.size)}) — extraction may be slow`, {
        description:
          kind === 'image'
            ? 'Consider compressing with TinyPNG or Squoosh, or resizing to ~1600px wide before uploading.'
            : 'Consider compressing with iLovePDF or Smallpdf, or extracting just the flyer page.',
        duration: 6000,
      });
    }

    setFile(f);
    if (kind === 'image') {
      setPreviewUrl(URL.createObjectURL(f));
    } else {
      setPreviewUrl(null);
    }
  };

  const handleExtract = async () => {
    setExtracting(true);
    setCandidates([]);
    startRef.current = Date.now();
    setElapsed(0);
    setEstimate(estimateSeconds(tab, file));
    setFailedStage(null);
    setStages(buildStages(tab));
    setSlowWarning(false);
    setLastFailure(null);
    attemptRef.current += 1;
    // Mark this run as in-progress in localStorage so a refresh / accidental
    // navigation can offer to resume from this exact tab + inputs.
    saveDraftPartial({
      tab,
      sourceUrl,
      pastedText,
      candidates: [],
      inProgress: {
        kind: tab,
        startedAt: Date.now(),
        hadFile: !!file,
        fileName: file?.name,
      },
    });
    setResumePrompt(null);
    // Soft warning at 70% of the hard timeout — gives users a heads-up
    // before we auto-cancel, so they can decide to wait or prepare a fallback.
    const hardTimeoutMs = FLYER_TIMEOUTS_MS[tab];
    const warnAt = Math.round(hardTimeoutMs * 0.7);
    const warnTimer = window.setTimeout(() => setSlowWarning(true), warnAt);
    let currentStage: StageKey = 'prepare';
    try {
      let input: FlyerInput;
      const trimmedSource = sourceUrl.trim() || undefined;

      // Stage 1: prepare input
      currentStage = 'prepare';
      setStage('prepare', 'active');

      if (tab === 'image') {
        if (!file) throw new Error('Choose an image first');
        const dataUrl = await fileToDataUrl(file);
        setStage('prepare', 'done', `${(file.size / 1024 / 1024).toFixed(1)} MB ready`);
        input = { kind: 'image', data: dataUrl, sourceUrl: trimmedSource };
      } else if (tab === 'pdf') {
        if (!file) throw new Error('Choose a PDF first');
        const dataUrl = await fileToDataUrl(file);
        setStage('prepare', 'done', `${(file.size / 1024 / 1024).toFixed(1)} MB ready`);
        input = { kind: 'pdf', data: dataUrl, sourceUrl: trimmedSource };
      } else if (tab === 'text') {
        if (pastedText.trim().length < 10) throw new Error('Paste the post text first');
        setStage('prepare', 'done', `${pastedText.trim().length} characters`);
        input = { kind: 'text', text: pastedText, sourceUrl: trimmedSource };
      } else {
        if (!/^https?:\/\//i.test(sourceUrl.trim())) {
          throw new Error('Enter a valid http(s) URL');
        }
        setStage('prepare', 'done', sourceUrl.trim().slice(0, 60));
        input = { kind: 'url', sourceUrl: sourceUrl.trim() };
      }

      // Stage 2 & 3: upload + analyse — both happen inside the single edge call,
      // so we mark upload active immediately and flip to analyse after a short
      // delay so the user can see progress through the steps.
      currentStage = 'upload';
      setStage('upload', 'active');

      // Live ETA refinement: once the request is in flight, the prepare phase
      // is done. Re-anchor the estimate so the bar reflects the *remaining*
      // server-side work (analyse), not the whole pipeline.
      const prepareElapsedMs = Date.now() - startRef.current;
      const remainingEstSec = Math.max(
        3,
        getFlyerEtaSeconds(tab, file?.size) -
          Math.round(prepareElapsedMs / 1000),
      );
      // Push the deadline outwards so the bar tracks elapsed + remaining.
      setEstimate(Math.round(prepareElapsedMs / 1000) + remainingEstSec);

      const analyseTimer = window.setTimeout(() => {
        setStage('upload', 'done');
        setStage('analyse', 'active');
        currentStage = 'analyse';
      }, 1200);

      let extracted: ExtractedCandidate[] = [];
      let total_extracted = 0;
      let serverTimings: { scrape?: number; gemini?: number; total?: number } | undefined;
      let resolvedVia: string | undefined;
      try {
        const res = await extractFlyer(input);
        extracted = res.candidates;
        total_extracted = res.total_extracted;
        serverTimings = res.timings;
        resolvedVia = res.resolved_via;
      } finally {
        window.clearTimeout(analyseTimer);
      }

      // Record the real total elapsed for next-run ETA learning.
      const totalElapsedMs = Date.now() - startRef.current;
      recordFlyerSample(tab, totalElapsedMs);

      // Make sure both upload & analyse are marked done before save, with
      // real server-side timings shown if present.
      const uploadNote = serverTimings?.scrape
        ? `Scraped in ${(serverTimings.scrape / 1000).toFixed(1)}s${resolvedVia ? ` via ${resolvedVia}` : ''}`
        : undefined;
      const analyseNote = serverTimings?.gemini
        ? `AI analysed in ${(serverTimings.gemini / 1000).toFixed(1)}s — ${total_extracted} raw event${total_extracted === 1 ? '' : 's'}`
        : `${total_extracted} raw event${total_extracted === 1 ? '' : 's'} found`;
      setStage('upload', 'done', uploadNote);
      setStage('analyse', 'done', analyseNote);

      // Stage 4: finalise
      currentStage = 'save';
      setStage('save', 'active');

      if (extracted.length === 0) {
        if (total_extracted > 0) {
          toast.warning(
            `Found ${total_extracted} event(s) but none had a valid future date.`,
          );
        } else {
          toast.warning('No dated events found in this flyer.');
        }
      } else {
        toast.success(`Found ${extracted.length} event${extracted.length === 1 ? '' : 's'}`);
      }
      setCandidates(
        extracted.map((c, i) => ({
          ...c,
          _id: `${Date.now()}-${i}`,
          _selected: true,
        })),
      );
      setStage('save', 'done', `${extracted.length} ready to review`);
    } catch (e) {
      const isTimeout = e instanceof FlyerTimeoutError;
      const timeoutMs = isTimeout ? (e as FlyerTimeoutError).timeoutMs : undefined;
      const friendly = isTimeout
        ? `Extraction took longer than ${Math.round((timeoutMs ?? hardTimeoutMs) / 1000)}s and was cancelled.`
        : e instanceof Error
          ? e.message
          : 'Extraction failed';
      setFailedStage(currentStage);
      setStage(currentStage, 'failed', isTimeout ? 'Timed out — auto-cancelled' : friendly);
      setLastFailure({
        kind: tab,
        isTimeout,
        timeoutMs,
        message: friendly,
        attempt: attemptRef.current,
      });
      if (isTimeout) {
        toast.error('Extraction timed out', {
          description: 'See the panel below for retry options and faster alternatives.',
        });
      } else {
        toast.error(friendly);
      }
    } finally {
      window.clearTimeout(warnTimer);
      setSlowWarning(false);
      setExtracting(false);
    }
  };

  const updateCandidate = (id: string, patch: Partial<EditableCandidate>) => {
    setCandidates((prev) => prev.map((c) => (c._id === id ? { ...c, ...patch } : c)));
  };

  const handleSave = async () => {
    const selected = candidates.filter((c) => c._selected);
    if (selected.length === 0) {
      toast.error('Select at least one event to save');
      return;
    }
    // Strip internal fields
    const payload = selected.map(({ _id, ...rest }) => ({
      ...rest,
      _selected: true as const,
    }));

    // If the user uploaded an image or PDF, persist it to the public
    // flyer-images bucket so the original flyer can be attached to each
    // saved event. Failure to upload should NOT block saving the events
    // themselves — we just lose the image attachment.
    let flyerImageUrl: string | null = null;
    if (file && (tab === 'image' || tab === 'pdf')) {
      try {
        const ext = file.name.split('.').pop()?.toLowerCase() || (tab === 'pdf' ? 'pdf' : 'jpg');
        const safeExt = ext.replace(/[^a-z0-9]/g, '').slice(0, 5) || 'bin';
        const objectKey = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${safeExt}`;
        const { error: uploadError } = await supabase.storage
          .from('flyer-images')
          .upload(objectKey, file, {
            cacheControl: '31536000',
            contentType: file.type || undefined,
            upsert: false,
          });
        if (uploadError) throw uploadError;
        const { data: pub } = supabase.storage
          .from('flyer-images')
          .getPublicUrl(objectKey);
        flyerImageUrl = pub.publicUrl;
      } catch (e) {
        console.error('Flyer upload failed', e);
        toast.warning('Could not attach the original flyer image — saving the events anyway.');
      }
    }

    await onSave(payload, sourceUrl.trim() || null, flyerImageUrl);
    setCandidates([]);
    setFile(null);
    setPreviewUrl(null);
    setPastedText('');
    setSourceUrl('');
    clearDraft();
  };

  const selectedCount = candidates.filter((c) => c._selected).length;

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="image">
            <ImageIcon className="h-4 w-4 mr-1" /> Image
          </TabsTrigger>
          <TabsTrigger value="pdf">
            <FileType className="h-4 w-4 mr-1" /> PDF
          </TabsTrigger>
          <TabsTrigger value="text">
            <FileText className="h-4 w-4 mr-1" /> Text
          </TabsTrigger>
          <TabsTrigger value="url">
            <Link2 className="h-4 w-4 mr-1" /> URL
          </TabsTrigger>
        </TabsList>

        <TabsContent value="image" className="space-y-3 pt-3">
          <Label>Flyer image (JPG / PNG / WebP, max {formatMB(MAX_IMAGE_BYTES)})</Label>
          <Input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => onFileChange(e.target.files?.[0] ?? null, 'image')}
          />
          <p className="text-[11px] text-muted-foreground">
            Recommended under {formatMB(WARN_IMAGE_BYTES)} (~1600px wide).
            Compress with{' '}
            <a href="https://tinypng.com" target="_blank" rel="noopener noreferrer" className="underline">
              TinyPNG
            </a>{' '}
            or{' '}
            <a href="https://squoosh.app" target="_blank" rel="noopener noreferrer" className="underline">
              Squoosh
            </a>{' '}
            if it's larger.
          </p>
          {file && tab === 'image' && file.size > WARN_IMAGE_BYTES && (
            <p className="text-xs text-amber-500">
              ⚠ {formatMB(file.size)} is large — extraction may be slow or time out. Compressing first is recommended.
            </p>
          )}
          {previewUrl && (
            <img
              src={previewUrl}
              alt="Flyer preview"
              className="max-h-64 rounded-md border border-border object-contain"
            />
          )}
        </TabsContent>

        <TabsContent value="pdf" className="space-y-3 pt-3">
          <Label>Flyer PDF (max {formatMB(MAX_PDF_BYTES)})</Label>
          <Input
            type="file"
            accept="application/pdf"
            onChange={(e) => onFileChange(e.target.files?.[0] ?? null, 'pdf')}
          />
          <p className="text-[11px] text-muted-foreground">
            Recommended under {formatMB(WARN_PDF_BYTES)}. Compress with{' '}
            <a href="https://www.ilovepdf.com/compress_pdf" target="_blank" rel="noopener noreferrer" className="underline">
              iLovePDF
            </a>{' '}
            or extract just the flyer page if it's larger.
          </p>
          {file && tab === 'pdf' && (
            <p className="text-sm text-muted-foreground">
              {file.name} ({formatMB(file.size)})
            </p>
          )}
          {file && tab === 'pdf' && file.size > WARN_PDF_BYTES && (
            <p className="text-xs text-amber-500">
              ⚠ {formatMB(file.size)} is large — extraction may be slow or time out. Compressing first is recommended.
            </p>
          )}
        </TabsContent>


        <TabsContent value="text" className="space-y-3 pt-3">
          <Label>Paste the Facebook / Instagram post text</Label>
          <Textarea
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            rows={8}
            placeholder="Paste the post here, including all dates and details..."
          />
        </TabsContent>

        <TabsContent value="url" className="space-y-3 pt-3">
          <Label>Public link to the post or event page</Label>
          <Input
            type="url"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="https://facebook.com/... or https://venue.co.uk/events"
          />
          <p className="text-xs text-muted-foreground">
            Heads up: many Facebook posts require login. If extraction fails, take a
            screenshot and use the Image tab instead.
          </p>
        </TabsContent>
      </Tabs>

      {tab !== 'url' && (
        <div className="space-y-2">
          <Label>Source link (optional but recommended)</Label>
          <Input
            type="url"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="https://facebook.com/post/..."
          />
        </div>
      )}

      <Button
        type="button"
        onClick={handleExtract}
        disabled={extracting}
        className="w-full"
      >
        {extracting ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Reading flyer...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4 mr-2" /> Extract events
          </>
        )}
      </Button>

      {(extracting || failedStage) && stages.length > 0 && (
        <div className="space-y-3 rounded-md border border-border bg-card/40 p-3">
          {extracting && (
            <>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Elapsed: {formatTime(elapsed)}</span>
                <span>
                  {elapsed < estimate
                    ? `~${formatTime(estimate - elapsed)} remaining`
                    : 'Almost done — finishing up...'}
                </span>
              </div>
              <Progress
                value={
                  estimate > 0
                    ? Math.min(99, Math.round((elapsed / estimate) * 100))
                    : 0
                }
              />
            </>
          )}

          <ol className="space-y-1.5">
            {stages.map((s, idx) => {
              const isActive = s.status === 'active';
              const isDone = s.status === 'done';
              const isFailed = s.status === 'failed';
              // Per-stage elapsed (live while active, frozen when done/failed)
              // stageTick is referenced so React re-renders this row each tick.
              void stageTick;
              const stageElapsedMs = isActive && s.startedAt
                ? Date.now() - s.startedAt
                : s.durationMs ?? 0;
              const stageElapsedSec = stageElapsedMs > 0
                ? (stageElapsedMs / 1000).toFixed(stageElapsedMs < 10000 ? 1 : 0)
                : null;
              const slow = isActive && stageElapsedMs > 8000;
              return (
                <li
                  key={s.key}
                  className={cn(
                    'flex items-start gap-2 text-xs',
                    isActive && 'text-foreground',
                    isDone && 'text-muted-foreground',
                    isFailed && 'text-destructive',
                    !isActive && !isDone && !isFailed && 'text-muted-foreground/60',
                  )}
                >
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
                    {isDone && <Check className="h-3.5 w-3.5 text-accent" />}
                    {isActive && <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />}
                    {isFailed && <XIcon className="h-3.5 w-3.5" />}
                    {!isActive && !isDone && !isFailed && (
                      <Circle className="h-2 w-2" />
                    )}
                  </span>
                  <span className="flex-1">
                    <span className="flex flex-wrap items-center gap-x-2">
                      <span className="font-medium">
                        {idx + 1}. {s.label}
                      </span>
                      {stageElapsedSec && (
                        <span
                          className={cn(
                            'rounded bg-muted/40 px-1.5 py-0.5 font-mono text-[10px] tabular-nums',
                            isActive ? 'text-foreground' : 'text-muted-foreground/70',
                          )}
                        >
                          {stageElapsedSec}s
                        </span>
                      )}
                    </span>
                    {s.note && (
                      <span className="block text-[11px] opacity-80">{s.note}</span>
                    )}
                    {slow && !s.note && (
                      <span className="block text-[11px] text-muted-foreground/80">
                        Still working on this step…
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ol>

          {extracting && (
            <p className="text-[11px] text-muted-foreground">
              {tab === 'image' && 'Reading the flyer image with AI vision — large or busy flyers can take longer.'}
              {tab === 'pdf' && 'Parsing the PDF and extracting events — multi-page documents take longer.'}
              {tab === 'text' && 'Analysing the pasted text for dated events.'}
              {tab === 'url' && 'Fetching the page and analysing it — login-walled posts may fail.'}
              {' '}ETA learns from your past runs. Will auto-cancel after {Math.round(FLYER_TIMEOUTS_MS[tab] / 1000)}s.
            </p>
          )}

          {extracting && slowWarning && (
            <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/5 p-2 text-[11px]">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
              <div className="flex-1 text-foreground/90">
                <span className="font-medium">Taking longer than usual.</span>{' '}
                <span className="text-muted-foreground">
                  We'll auto-cancel at {Math.round(FLYER_TIMEOUTS_MS[tab] / 1000)}s. You can wait, or prepare a fallback ({tab === 'url' ? 'paste the post text' : tab === 'pdf' ? 'split the PDF or paste the text' : tab === 'image' ? 'shrink the image or paste the text' : 'simplify the text'}).
                </span>
              </div>
            </div>
          )}

          {failedStage && !extracting && lastFailure && (
            <div className="space-y-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <div className="flex-1 space-y-1">
                  <p className="font-medium text-destructive">
                    {lastFailure.isTimeout
                      ? `Timed out after ${Math.round((lastFailure.timeoutMs ?? FLYER_TIMEOUTS_MS[lastFailure.kind]) / 1000)}s`
                      : 'Extraction failed'}
                  </p>
                  <p className="text-muted-foreground">{lastFailure.message}</p>
                </div>
              </div>

              <div className="space-y-1 pl-6">
                <p className="text-[11px] font-medium text-foreground">Try one of these:</p>
                <ul className="ml-4 list-disc space-y-0.5 text-[11px] text-muted-foreground">
                  {lastFailure.kind === 'image' && (
                    <>
                      <li>Compress or crop the image to under 4 MB.</li>
                      <li>Re-take the photo with better lighting / less glare.</li>
                      <li>Switch to the <span className="font-medium">Text</span> tab and paste the flyer text.</li>
                    </>
                  )}
                  {lastFailure.kind === 'pdf' && (
                    <>
                      <li>Split multi-page PDFs and try a single page.</li>
                      <li>Export the PDF as a JPG and use the <span className="font-medium">Image</span> tab.</li>
                      <li>Copy the text out and use the <span className="font-medium">Text</span> tab.</li>
                    </>
                  )}
                  {lastFailure.kind === 'url' && (
                    <>
                      <li>Login-walled posts (private FB/IG) can't be scraped — paste the text instead.</li>
                      <li>Take a screenshot of the post and use the <span className="font-medium">Image</span> tab.</li>
                      <li>Try the public mobile URL (e.g. <code className="rounded bg-muted px-1">m.facebook.com</code>).</li>
                    </>
                  )}
                  {lastFailure.kind === 'text' && (
                    <>
                      <li>Trim down extremely long text (over a few thousand chars).</li>
                      <li>Make sure dates and event names are present in the text.</li>
                      <li>Retry — the AI service may have been briefly overloaded.</li>
                    </>
                  )}
                </ul>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleExtract}
                  className="h-7 text-xs"
                >
                  <RotateCw className="mr-1.5 h-3 w-3" />
                  Retry {lastFailure.attempt > 1 ? `(attempt ${lastFailure.attempt + 1})` : ''}
                </Button>
                {(lastFailure.kind === 'url' || lastFailure.kind === 'image' || lastFailure.kind === 'pdf') && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setTab('text');
                      setFailedStage(null);
                      setLastFailure(null);
                    }}
                    className="h-7 text-xs"
                  >
                    <Clipboard className="mr-1.5 h-3 w-3" />
                    Paste text instead
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {candidates.length > 0 && (
        <div className="space-y-3 pt-2">
          {restoredAt && (
            <div className="flex items-center justify-between gap-2 rounded-md border border-accent/40 bg-accent/5 p-2 text-xs">
              <span className="text-muted-foreground">
                Restored draft from{' '}
                {new Date(restoredAt).toLocaleString('en-GB', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false,
                })}
                {' '}— continue reviewing or discard.
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={handleDiscardDraft}
              >
                Discard
              </Button>
            </div>
          )}
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm tracking-wider">
              Found {candidates.length} event{candidates.length === 1 ? '' : 's'} — review &amp; edit
            </h3>
            <span className="text-xs text-muted-foreground">
              {selectedCount} selected
            </span>
          </div>


          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
            {candidates.map((c) => (
              <Card key={c._id} className="bg-card/50">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <Checkbox
                      checked={c._selected}
                      onCheckedChange={(v) =>
                        updateCandidate(c._id, { _selected: !!v })
                      }
                      className="mt-1"
                    />
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="sm:col-span-2">
                        <Label className="text-xs">Title</Label>
                        <Input
                          value={c.title}
                          onChange={(e) =>
                            updateCandidate(c._id, { title: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Date</Label>
                        <Input
                          type="date"
                          value={c.event_date}
                          onChange={(e) =>
                            updateCandidate(c._id, { event_date: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Type</Label>
                        <Select
                          value={c.event_type}
                          onValueChange={(v) =>
                            updateCandidate(c._id, { event_type: v as EventType })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(EVENT_TYPE_LABELS).map(([k, v]) => (
                              <SelectItem key={k} value={k}>
                                {v}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Venue</Label>
                        <Input
                          value={c.venue_name ?? ''}
                          onChange={(e) =>
                            updateCandidate(c._id, { venue_name: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Location</Label>
                        <Input
                          value={c.venue_location ?? ''}
                          onChange={(e) =>
                            updateCandidate(c._id, { venue_location: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Start</Label>
                        <Input
                          type="time"
                          value={c.start_time ?? ''}
                          onChange={(e) =>
                            updateCandidate(c._id, { start_time: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-xs">End</Label>
                        <Input
                          type="time"
                          value={c.end_time ?? ''}
                          onChange={(e) =>
                            updateCandidate(c._id, { end_time: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Price</Label>
                        <Input
                          value={c.price_info ?? ''}
                          onChange={(e) =>
                            updateCandidate(c._id, { price_info: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Booking URL</Label>
                        <Input
                          type="url"
                          value={c.booking_url ?? ''}
                          onChange={(e) =>
                            updateCandidate(c._id, { booking_url: e.target.value })
                          }
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <Label className="text-xs">Description</Label>
                        <Textarea
                          rows={2}
                          value={c.description ?? ''}
                          onChange={(e) =>
                            updateCandidate(c._id, { description: e.target.value })
                          }
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Button
            type="button"
            onClick={handleSave}
            disabled={saving || selectedCount === 0}
            className="w-full"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" /> {saveLabel} ({selectedCount})
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
