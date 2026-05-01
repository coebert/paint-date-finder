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
  ) => {
    setSaving(true);
    try {
      const rows = candidates.map((c) => ({
        title: c.title.slice(0, 200),
        description: c.description?.slice(0, 2000) ?? null,
        event_type: c.event_type,
        venue_name: (c.venue_name || 'Unknown venue').slice(0, 200),
        venue_location: c.venue_location?.slice(0, 200) ?? null,
        event_date: c.event_date,
        start_time: c.start_time || null,
        end_time: c.end_time || null,
        booking_url: c.booking_url || null,
        price_info: c.price_info?.slice(0, 100) ?? null,
        source_url: sourceUrl,
        is_verified: true,
      }));
      const { error } = await supabase.from('events').insert(rows);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ['events'] });
      toast.success(`Added ${rows.length} event${rows.length === 1 ? '' : 's'} to the calendar`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to save events';
      toast.error(msg);
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
