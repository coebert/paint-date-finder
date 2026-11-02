import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Obstacle } from '@/types/fieldLayout';
import { sanitizeObstacles, MAX_LAYOUT_OBSTACLES } from '@/lib/fieldLayoutValidation';

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

/** Returns false if the browser refused to save (private mode, storage full). */
export function storeToken(layoutId: string, token: string): boolean {
  try {
    const tokens = getStoredTokens();
    tokens[layoutId] = token;
    localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
    return true;
  } catch {
    return false;
  }
}

function removeStoredToken(layoutId: string) {
  try {
    const tokens = getStoredTokens();
    delete tokens[layoutId];
    localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
  } catch {
    /* storage unavailable */
  }
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
      // Shared layouts are community-submitted: keep only well-formed obstacles
      // and hide rows that have nothing drawable left.
      return (data ?? []).flatMap((row: any) => {
        const { obstacles } = sanitizeObstacles(row.obstacles);
        if (obstacles.length === 0) return [];
        return [{
          ...row,
          name: String(row.name ?? 'Untitled').slice(0, 200),
          tags: Array.isArray(row.tags) ? row.tags.filter((t: unknown) => typeof t === 'string').slice(0, 20) : [],
          obstacles,
          obstacle_count: obstacles.length,
        }];
      });
    },
  });
}

export function useSaveFieldLayout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SaveLayoutInput): Promise<{ id: string; delete_token: string }> => {
      const { obstacles: clean, rejected } = sanitizeObstacles(input.obstacles);
      if (clean.length === 0) throw new Error('Add at least one bunker before sharing.');
      if (rejected > 0 || input.obstacles.length > MAX_LAYOUT_OBSTACLES) {
        throw new Error(`This layout has ${rejected} invalid bunker${rejected === 1 ? '' : 's'} (max ${MAX_LAYOUT_OBSTACLES}).`);
      }
      input = { ...input, obstacles: clean };
      const { data, error } = await supabase.rpc('create_field_layout', {
        _name: input.name,
        _description: input.description || null,
        _author_name: input.author_name || null,
        _tags: input.tags ?? [],
        _obstacles: input.obstacles as any,
        _obstacle_count: input.obstacles.length,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : (data as any);
      if (!row?.id || !row?.delete_token) throw new Error('Failed to create layout');
      const tokenSaved = storeToken(row.id, row.delete_token);
      return { id: row.id, delete_token: row.delete_token, tokenSaved };
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
