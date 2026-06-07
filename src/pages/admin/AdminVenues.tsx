import { useState } from 'react';
import { AdminLayout } from '@/layouts/AdminLayout';
import { useAdminVenues, useUpdateVenue, type VenueProfile } from '@/hooks/useVenueProfile';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Pencil, MapPin } from 'lucide-react';

export default function AdminVenues() {
  const { data: venues = [], isLoading } = useAdminVenues();
  const update = useUpdateVenue();
  const [editing, setEditing] = useState<VenueProfile | null>(null);
  const [form, setForm] = useState<Partial<VenueProfile>>({});

  const openEdit = (v: VenueProfile) => {
    setEditing(v);
    setForm({
      website: v.website ?? '',
      location: v.location ?? '',
      region: v.region ?? '',
      latitude: v.latitude,
      longitude: v.longitude,
      field_map_url: v.field_map_url ?? '',
      walk_on_rules: v.walk_on_rules ?? '',
      gallery: v.gallery,
      facilities: v.facilities,
      hire_prices: v.hire_prices ?? {},
    });
  };

  const onSave = async () => {
    if (!editing) return;
    await update.mutateAsync({ id: editing.id, updates: form });
    setEditing(null);
  };

  return (
    <AdminLayout title="VENUES" description="Edit venue profile pages with hire prices, walk-on rules, facilities, field map and gallery.">
      {isLoading ? (
        <Skeleton className="h-64 bg-card" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {venues.map((v) => (
            <Card key={v.id} className="bg-card border-border/50">
              <CardContent className="p-4 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-display text-lg text-foreground truncate">{v.name}</h3>
                  <p className="text-xs text-muted-foreground inline-flex items-center gap-1 truncate">
                    <MapPin className="h-3 w-3" /> {v.location ?? '—'} {v.region && `· ${v.region}`}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {v.facilities.length} facilities · {v.gallery.length} photos
                    {v.field_map_url && ' · field map'} {v.walk_on_rules && ' · rules'}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => openEdit(v)} className="gap-1">
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Location</Label>
                <Input value={(form.location as string) ?? ''}
                  onChange={(e) => setForm({ ...form, location: e.target.value || null })} />
              </div>
              <div>
                <Label>Region</Label>
                <Input value={(form.region as string) ?? ''}
                  onChange={(e) => setForm({ ...form, region: e.target.value || null })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Latitude</Label>
                <Input type="number" step="any" value={form.latitude ?? ''}
                  onChange={(e) => setForm({ ...form, latitude: e.target.value ? Number(e.target.value) : null })} />
              </div>
              <div>
                <Label>Longitude</Label>
                <Input type="number" step="any" value={form.longitude ?? ''}
                  onChange={(e) => setForm({ ...form, longitude: e.target.value ? Number(e.target.value) : null })} />
              </div>
            </div>
            <div>
              <Label>Website</Label>
              <Input value={(form.website as string) ?? ''}
                onChange={(e) => setForm({ ...form, website: e.target.value || null })} />
            </div>
            <div>
              <Label>Field map URL</Label>
              <Input value={(form.field_map_url as string) ?? ''}
                onChange={(e) => setForm({ ...form, field_map_url: e.target.value || null })} />
            </div>
            <div>
              <Label>Walk-on rules</Label>
              <Textarea rows={4} value={(form.walk_on_rules as string) ?? ''}
                onChange={(e) => setForm({ ...form, walk_on_rules: e.target.value || null })} />
            </div>
            <div>
              <Label>Facilities (comma-separated)</Label>
              <Input value={(form.facilities ?? []).join(', ')}
                onChange={(e) => setForm({ ...form, facilities: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} />
            </div>
            <div>
              <Label>Gallery URLs (one per line)</Label>
              <Textarea rows={3} value={(form.gallery ?? []).join('\n')}
                onChange={(e) => setForm({ ...form, gallery: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) })} />
            </div>
            <div>
              <Label>Hire prices (JSON)</Label>
              <Textarea rows={4} value={JSON.stringify(form.hire_prices ?? {}, null, 2)}
                onChange={(e) => {
                  try { setForm({ ...form, hire_prices: JSON.parse(e.target.value || '{}') }); } catch { /* ignore */ }
                }} />
              <p className="text-xs text-muted-foreground mt-1">
                {`Example: { "Marker hire": "£10", "500 paint": "£8" }`}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={onSave} disabled={update.isPending}>
              {update.isPending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
