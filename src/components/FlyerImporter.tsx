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
import { Loader2, Sparkles, Upload, ImageIcon, Link2, FileText, FileType } from 'lucide-react';
import { toast } from 'sonner';
import {
  extractFlyer,
  fileToDataUrl,
  type ExtractedCandidate,
  type FlyerInput,
} from '@/lib/flyerExtraction';
import { EVENT_TYPE_LABELS, type EventType } from '@/types/events';

export interface FlyerImporterProps {
  /** Called once the user has reviewed candidates and clicks Save. */
  onSave: (
    candidates: (ExtractedCandidate & { _selected: true })[],
    sourceUrl: string | null,
  ) => Promise<void> | void;
  /** Label for the save button. */
  saveLabel?: string;
  /** Disable the save button (e.g. mid-mutation). */
  saving?: boolean;
}

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB
const MAX_PDF_BYTES = 10 * 1024 * 1024; // 10 MB

type EditableCandidate = ExtractedCandidate & {
  _id: string;
  _selected: boolean;
};

export function FlyerImporter({ onSave, saveLabel = 'Save selected', saving }: FlyerImporterProps) {
  const [tab, setTab] = useState<'image' | 'pdf' | 'text' | 'url'>('image');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [estimate, setEstimate] = useState(0);
  const startRef = useRef<number>(0);
  const [candidates, setCandidates] = useState<EditableCandidate[]>([]);

  // Tick elapsed seconds while extracting
  useEffect(() => {
    if (!extracting) return;
    const id = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 500);
    return () => window.clearInterval(id);
  }, [extracting]);

  // Rough per-tab time estimates (seconds), adjusted by file size for image/pdf
  const estimateSeconds = (
    kind: 'image' | 'pdf' | 'text' | 'url',
    f: File | null,
  ): number => {
    if (kind === 'text') return 6;
    if (kind === 'url') return 18;
    if (!f) return kind === 'pdf' ? 35 : 25;
    const mb = f.size / 1024 / 1024;
    const base = kind === 'pdf' ? 25 : 15;
    return Math.round(base + mb * 4);
  };

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
    const limit = kind === 'image' ? MAX_IMAGE_BYTES : MAX_PDF_BYTES;
    if (f.size > limit) {
      toast.error(`File too large. Max ${Math.round(limit / 1024 / 1024)}MB.`);
      return;
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
    try {
      let input: FlyerInput;
      const trimmedSource = sourceUrl.trim() || undefined;

      if (tab === 'image') {
        if (!file) throw new Error('Choose an image first');
        const dataUrl = await fileToDataUrl(file);
        input = { kind: 'image', data: dataUrl, sourceUrl: trimmedSource };
      } else if (tab === 'pdf') {
        if (!file) throw new Error('Choose a PDF first');
        const dataUrl = await fileToDataUrl(file);
        input = { kind: 'pdf', data: dataUrl, sourceUrl: trimmedSource };
      } else if (tab === 'text') {
        if (pastedText.trim().length < 10) throw new Error('Paste the post text first');
        input = { kind: 'text', text: pastedText, sourceUrl: trimmedSource };
      } else {
        if (!/^https?:\/\//i.test(sourceUrl.trim())) {
          throw new Error('Enter a valid http(s) URL');
        }
        input = { kind: 'url', sourceUrl: sourceUrl.trim() };
      }

      const { candidates: extracted, total_extracted } = await extractFlyer(input);
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
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Extraction failed';
      toast.error(msg);
    } finally {
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
    await onSave(payload, sourceUrl.trim() || null);
    setCandidates([]);
    setFile(null);
    setPreviewUrl(null);
    setPastedText('');
    setSourceUrl('');
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
          <Label>Flyer image (JPG / PNG / WebP, max 8MB)</Label>
          <Input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => onFileChange(e.target.files?.[0] ?? null, 'image')}
          />
          {previewUrl && (
            <img
              src={previewUrl}
              alt="Flyer preview"
              className="max-h-64 rounded-md border border-border object-contain"
            />
          )}
        </TabsContent>

        <TabsContent value="pdf" className="space-y-3 pt-3">
          <Label>Flyer PDF (max 10MB)</Label>
          <Input
            type="file"
            accept="application/pdf"
            onChange={(e) => onFileChange(e.target.files?.[0] ?? null, 'pdf')}
          />
          {file && tab === 'pdf' && (
            <p className="text-sm text-muted-foreground">{file.name}</p>
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

      {extracting && (
        <div className="space-y-2 rounded-md border border-border bg-card/40 p-3">
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
          <p className="text-[11px] text-muted-foreground">
            {tab === 'image' && 'Reading the flyer image with AI vision — large or busy flyers can take longer.'}
            {tab === 'pdf' && 'Parsing the PDF and extracting events — multi-page documents take longer.'}
            {tab === 'text' && 'Analysing the pasted text for dated events.'}
            {tab === 'url' && 'Fetching the page and analysing it — login-walled posts may fail.'}
          </p>
        </div>
      )}

      {candidates.length > 0 && (
        <div className="space-y-3 pt-2">
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
