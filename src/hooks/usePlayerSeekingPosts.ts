import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { EventType } from '@/types/events';

export interface PlayerSeekingPost {
  id: string;
  player_name: string;
  contact_email: string;
  target_date: string;
  region: string | null;
  event_type: EventType | null;
  notes: string | null;
  expires_at: string;
  is_hidden: boolean;
  created_at: string;
}

export interface NewPlayerSeekingPost {
  player_name: string;
  contact_email: string;
  target_date: string;
  region?: string | null;
  event_type?: EventType | null;
  notes?: string | null;
}

export function usePlayerSeekingPosts() {
  return useQuery({
    queryKey: ['player-seeking-posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('player_seeking_posts')
        .select('id, player_name, target_date, region, event_type, notes, expires_at, is_hidden, created_at')
        .order('target_date', { ascending: true });
      if (error) throw error;
      return data as PlayerSeekingPost[];
    },
  });
}

export function useAdminPlayerSeekingPosts() {
  return useQuery({
    queryKey: ['admin-player-seeking-posts'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_admin_player_seeking_posts');
      if (error) throw error;
      return (data ?? []) as PlayerSeekingPost[];
    },
  });
}

export function useCreatePlayerSeekingPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewPlayerSeekingPost) => {
      const target = new Date(input.target_date);
      const expires = new Date(target);
      expires.setDate(expires.getDate() + 7);
      const expires_at = expires.toISOString().slice(0, 10);

      const { data, error } = await supabase.rpc('create_player_seeking_post', {
        _player_name: input.player_name.trim(),
        _contact_email: input.contact_email.trim().toLowerCase(),
        _target_date: input.target_date,
        _expires_at: expires_at,
        _region: input.region?.trim() || null,
        _event_type: input.event_type ?? null,
        _notes: input.notes?.trim() || null,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return row as { id: string; delete_token: string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['player-seeking-posts'] });
      toast.success('Your post is live — keep the removal link safe.');
    },
    onError: (err: Error) => toast.error(`Failed to post: ${err.message}`),
  });
}

export function useDeletePlayerSeekingPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, token }: { id: string; token: string }) => {
      const { error } = await supabase.rpc('delete_player_seeking_post', {
        _id: id,
        _token: token,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['player-seeking-posts'] });
      toast.success('Post removed.');
    },
    onError: (err: Error) => toast.error(`Failed to remove: ${err.message}`),
  });
}

export function useAdminDeletePlayerSeekingPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('player_seeking_posts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-player-seeking-posts'] });
      qc.invalidateQueries({ queryKey: ['player-seeking-posts'] });
      toast.success('Post deleted.');
    },
  });
}
