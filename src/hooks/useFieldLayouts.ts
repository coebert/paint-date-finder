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

export function useFieldLayouts() {
  return useQuery({
    queryKey: ['field-layouts'],
    queryFn: async (): Promise<FieldLayout[]> => {
      const { data, error } = await supabase
        .from('field_layouts')
        .select('*')
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
    mutationFn: async (input: SaveLayoutInput) => {
      const { error } = await supabase.from('field_layouts').insert({
        name: input.name,
        description: input.description || null,
        author_name: input.author_name || null,
        tags: input.tags ?? [],
        obstacles: input.obstacles as any,
        obstacle_count: input.obstacles.length,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['field-layouts'] });
    },
  });
}
