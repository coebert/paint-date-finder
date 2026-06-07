import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Camera, Video, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useApprovedRecaps } from '@/hooks/useEventRecaps';
import { SubmitRecapDialog } from './SubmitRecapDialog';
import { ImageWithSkeleton } from './ImageWithSkeleton';

interface Props {
  eventId: string;
  eventTitle: string;
  eventDate: string; // ISO date
}

function isPast(eventDate: string) {
  return parseISO(eventDate) < new Date(new Date().toDateString());
}

export function RecapGallery({ eventId, eventTitle, eventDate }: Props) {
  const { data: recaps = [] } = useApprovedRecaps(eventId);
  const [submitOpen, setSubmitOpen] = useState(false);
  const past = isPast(eventDate);

  if (recaps.length === 0 && !past) return null;

  return (
    <section aria-labelledby="recaps-heading" className="pt-4 border-t border-border">
      <div className="flex items-center justify-between mb-3">
        <h2 id="recaps-heading" className="font-display text-xl tracking-wide text-foreground inline-flex items-center gap-2">
          <Camera className="h-5 w-5 text-accent" /> Event recaps
        </h2>
        {past && (
          <Button size="sm" variant="outline" onClick={() => setSubmitOpen(true)} className="gap-1">
            <Plus className="h-4 w-4" /> Share yours
          </Button>
        )}
      </div>

      {recaps.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Be the first to share a photo or video from this event.
        </p>
      ) : (
        <>
          <ul className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {recaps.map((r) => (
              <li key={r.id} className="space-y-1.5">
                {r.media_type === 'image' ? (
                  <a href={r.media_url} target="_blank" rel="noopener noreferrer"
                     className="block rounded-md border border-border overflow-hidden bg-muted">
                    <ImageWithSkeleton
                      src={r.media_url}
                      alt={r.caption || `Recap by ${r.uploader_name}`}
                      className="w-full aspect-square object-cover"
                    />
                  </a>
                ) : (
                  <a href={r.media_url} target="_blank" rel="noopener noreferrer"
                     className="flex items-center justify-center w-full aspect-square rounded-md border border-border bg-card hover:border-accent/60 transition-colors">
                    <Video className="h-10 w-10 text-accent" />
                  </a>
                )}
                <div className="text-xs text-muted-foreground">
                  <p className="font-medium text-foreground truncate">{r.uploader_name}</p>
                  {r.caption && <p className="line-clamp-2">{r.caption}</p>}
                  <p>{format(parseISO(r.created_at), 'd MMM yyyy')}</p>
                </div>
              </li>
            ))}
          </ul>
          {/* ImageObject / VideoObject JSON-LD for SEO */}
          <script type="application/ld+json">{JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': recaps.map((r) => ({
              '@type': r.media_type === 'image' ? 'ImageObject' : 'VideoObject',
              contentUrl: r.media_url,
              name: r.caption || `Recap from ${eventTitle}`,
              uploadDate: r.created_at,
              creditText: r.uploader_name,
            })),
          })}</script>
        </>
      )}

      <SubmitRecapDialog
        eventId={eventId}
        eventTitle={eventTitle}
        open={submitOpen}
        onOpenChange={setSubmitOpen}
      />
    </section>
  );
}
