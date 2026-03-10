import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Obstacle } from '@/types/fieldLayout';

export interface FieldLayout {
  id: string;
  name: string;
  description: string | null;
  author_name: string | null;
  tags: string[];
  obstacles: Obstacle[];
  obstacle_count: number;
  created_at: string;
}

interface SaveLayoutInput {
  name: string;
  description?: string;
  author_name?: string;
  tags?: string[];
  obstacles: Obstacle[];
}

// Store/retrieve delete tokens in localStorage
const TOKEN_KEY = 'field_layout_tokens';

function getStoredTokens(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(TOKEN_KEY) || '{}');
  } catch {
    return {};
  }
}

function storeToken(layoutId: string, token: string) {
  const tokens = getStoredTokens();
  tokens[layoutId] = token;
  localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
}

function removeStoredToken(layoutId: string) {
  const tokens = getStoredTokens();
  delete tokens[layoutId];
  localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
}

export function getDeleteToken(layoutId: string): string | null {
  return getStoredTokens()[layoutId] || null;
}

export function useFieldLayouts() {
  return useQuery({
    queryKey: ['field-layouts'],
    queryFn: async (): Promise<FieldLayout[]> => {
      const { data, error } = await supabase
        .from('field_layouts')
        .select('id, name, description, author_name, tags, obstacles, obstacle_count, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row: any) => ({
        ...row,
        tags: row.tags ?? [],
        obstacles: (row.obstacles as any) ?? [],
      }));
    },
  });
}

export function useSaveFieldLayout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SaveLayoutInput): Promise<{ id: string; delete_token: string }> => {
      const { data, error } = await supabase.from('field_layouts').insert({
        name: input.name,
        description: input.description || null,
        author_name: input.author_name || null,
        tags: input.tags ?? [],
        obstacles: input.obstacles as any,
        obstacle_count: input.obstacles.length,
      }).select('id, delete_token').single();
      if (error) throw error;
      // Store token locally for future deletion
      storeToken(data.id, data.delete_token);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['field-layouts'] });
    },
  });
}

export function useDeleteFieldLayout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, token }: { id: string; token: string }) => {
      const { data, error } = await supabase.rpc('delete_field_layout', {
        _id: id,
        _token: token,
      });
      if (error) throw error;
      if (!data) throw new Error('Invalid delete token');
      removeStoredToken(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['field-layouts'] });
    },
  });
}
