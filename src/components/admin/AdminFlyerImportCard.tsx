import { isValidEventDate, normalizeTime } from '@/lib/submissionPayload';
import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { FlyerImporter } from '@/components/FlyerImporter';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Sparkles } from 'lucide-react';
import { dedupeCandidates } from '@/lib/flyerDedupe';
import { normalizeHttpUrl } from '@/lib/validation';

export function AdminFlyerImportCard() {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);

  const handleSave = async (
    candidates: Array<{
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
    }>,
    sourceUrl: string | null,
    flyerImageUrl: string | null,
  ) => {
    setSaving(true);
    try {
      const { unique, duplicates } = await dedupeCandidates(candidates, 'both', { exactOnly: true });
      if (duplicates.length > 0) {
        toast.warning(
          `Skipped ${duplicates.length} duplicate${duplicates.length === 1 ? '' : 's'} already in calendar/queue`,
        );
      }
      if (unique.length === 0) {
        toast.info('Nothing new to add — all candidates were duplicates.');
        return false;
      }
      const proof = normalizeHttpUrl(sourceUrl) ?? normalizeHttpUrl(flyerImageUrl);
      if (!proof) {
        toast.error("Add the organiser's page link (or keep the uploaded flyer) so each event has a source.");
        return false;
      }
      const noVenue = unique.find((c) => !c.venue_name?.trim());
      if (noVenue) {
        toast.error(`"${noVenue.title}" has no venue — add the venue shown on the flyer.`);
        return false;
      }
      const bad = unique.find((c) => !isValidEventDate(c.event_date));
      if (bad) {
        toast.error(`"${bad.title}" has an invalid date — fix it and save again.`);
        return false;
      }
      const rows = unique.map((c) => ({
        title: c.title.slice(0, 200),
        description: c.description?.slice(0, 2000) ?? null,
        event_type: c.event_type,
        venue_name: c.venue_name!.trim().slice(0, 200),
        venue_location: c.venue_location?.slice(0, 200) ?? null,
        event_date: c.event_date,
        start_time: normalizeTime(c.start_time, 'Start time'),
        end_time: normalizeTime(c.end_time, 'End time'),
        booking_url: normalizeHttpUrl(c.booking_url),
        price_info: c.price_info?.slice(0, 100) ?? null,
        source_url: proof,
        image_url: normalizeHttpUrl(flyerImageUrl),
        is_verified: true,
      }));
      const { error } = await supabase.from('events').insert(rows);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ['events'] });
      toast.success(`Added ${rows.length} event${rows.length === 1 ? '' : 's'} to the calendar`);
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to save events';
      toast.error(msg);
      return false;
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-accent" />
          Import from flyer
        </CardTitle>
        <CardDescription>
          Upload a Facebook flyer, PDF, pasted post text, or a URL — the AI extracts dated events
          and pushes them straight into the calendar as verified.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FlyerImporter
          onSave={handleSave}
          saveLabel="Publish to calendar"
          saving={saving}
        />
      </CardContent>
    </Card>
  );
}
