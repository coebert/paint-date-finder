import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Team } from '@/hooks/useTeams';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, X, Users } from 'lucide-react';

interface TeamEditDialogProps {
  team: Team | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DIVISIONS = ['Elite', 'Division 2', 'Division 3', 'Division 4', 'Division 5', 'Breakout', 'Independent'];
const LEAGUES = ['CPPS', 'Other'];

export function TeamEditDialog({ team, open, onOpenChange }: TeamEditDialogProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    name: '',
    division: '',
    league: 'CPPS',
    position: '',
    points: '',
    captain_name: '',
    contact_email: '',
    contact_phone: '',
    website: '',
    region: '',
    home_venue: '',
    description: '',
    logo_url: '',
    social_facebook: '',
    social_instagram: '',
  });

  // Sync form when team changes
  const [lastTeamId, setLastTeamId] = useState<string | null>(null);
  if (team && team.id !== lastTeamId) {
    setLastTeamId(team.id);
    setForm({
      name: team.name || '',
      division: team.division || '',
      position: team.position?.toString() || '',
      points: team.points?.toString() || '0',
      captain_name: team.captain_name || '',
      contact_email: team.contact_email || '',
      contact_phone: team.contact_phone || '',
      website: team.website || '',
      region: team.region || '',
      home_venue: team.home_venue || '',
      description: team.description || '',
      logo_url: team.logo_url || '',
      social_facebook: (team.social_media as Record<string, string>)?.facebook || '',
      social_instagram: (team.social_media as Record<string, string>)?.instagram || '',
    });
  }

  const updateTeam = useMutation({
    mutationFn: async (data: typeof form) => {
      if (!team) return;
      const socialMedia: Record<string, string> = {};
      if (data.social_facebook) socialMedia.facebook = data.social_facebook;
      if (data.social_instagram) socialMedia.instagram = data.social_instagram;

      const { error } = await supabase
        .from('teams')
        .update({
          name: data.name,
          division: data.division,
          position: data.position ? parseInt(data.position) : null,
          points: parseInt(data.points) || 0,
          captain_name: data.captain_name || null,
          contact_email: data.contact_email || null,
          contact_phone: data.contact_phone || null,
          website: data.website || null,
          region: data.region || null,
          home_venue: data.home_venue || null,
          description: data.description || null,
          logo_url: data.logo_url || null,
          social_media: socialMedia,
        })
        .eq('id', team.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast.success('Team updated successfully');
      onOpenChange(false);
      setLastTeamId(null);
    },
    onError: () => {
      toast.error('Failed to update team');
    },
  });

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !team) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be under 2MB');
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${team.id}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('team-logos')
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('team-logos')
        .getPublicUrl(path);

      setForm(prev => ({ ...prev, logo_url: urlData.publicUrl }));
      toast.success('Logo uploaded');
    } catch (err) {
      toast.error('Failed to upload logo');
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateTeam.mutate(form);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setLastTeamId(null); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display tracking-wider">EDIT TEAM</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-lg bg-secondary border border-border/50 flex items-center justify-center overflow-hidden flex-shrink-0">
              {form.logo_url ? (
                <img src={form.logo_url} alt="Team logo" className="w-full h-full object-contain p-1" />
              ) : (
                <Users className="w-8 h-8 text-muted-foreground" />
              )}
            </div>
            <div className="space-y-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleLogoUpload}
                accept="image/*"
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="gap-2"
              >
                <Upload className="w-3 h-3" />
                {uploading ? 'Uploading...' : 'Upload Logo'}
              </Button>
              {form.logo_url && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setForm(prev => ({ ...prev, logo_url: '' }))}
                  className="gap-1 text-destructive hover:text-destructive"
                >
                  <X className="w-3 h-3" />
                  Remove
                </Button>
              )}
            </div>
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Team Name</Label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label>Division</Label>
              <Select value={form.division} onValueChange={v => setForm(p => ({ ...p, division: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DIVISIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Position</Label>
              <Input type="number" value={form.position} onChange={e => setForm(p => ({ ...p, position: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Points</Label>
              <Input type="number" value={form.points} onChange={e => setForm(p => ({ ...p, points: e.target.value }))} />
            </div>
          </div>

          {/* Captain & Contact */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Captain Name</Label>
              <Input value={form.captain_name} onChange={e => setForm(p => ({ ...p, captain_name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Contact Email</Label>
              <Input type="email" value={form.contact_email} onChange={e => setForm(p => ({ ...p, contact_email: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Contact Phone</Label>
              <Input type="tel" value={form.contact_phone} onChange={e => setForm(p => ({ ...p, contact_phone: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Website</Label>
              <Input type="url" value={form.website} onChange={e => setForm(p => ({ ...p, website: e.target.value }))} placeholder="https://" />
            </div>
          </div>

          {/* Location */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Region</Label>
              <Input value={form.region} onChange={e => setForm(p => ({ ...p, region: e.target.value }))} placeholder="e.g. North East" />
            </div>
            <div className="space-y-2">
              <Label>Home Venue</Label>
              <Input value={form.home_venue} onChange={e => setForm(p => ({ ...p, home_venue: e.target.value }))} />
            </div>
          </div>

          {/* Social */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Facebook URL</Label>
              <Input value={form.social_facebook} onChange={e => setForm(p => ({ ...p, social_facebook: e.target.value }))} placeholder="https://facebook.com/..." />
            </div>
            <div className="space-y-2">
              <Label>Instagram URL</Label>
              <Input value={form.social_instagram} onChange={e => setForm(p => ({ ...p, social_instagram: e.target.value }))} placeholder="https://instagram.com/..." />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              rows={3}
              placeholder="Brief team description..."
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={updateTeam.isPending}>
              {updateTeam.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
