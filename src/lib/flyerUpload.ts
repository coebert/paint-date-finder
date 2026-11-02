import { supabase } from '@/integrations/supabase/client';

export class FlyerSignInRequired extends Error {
  constructor() {
    super('Please sign in to read a flyer automatically — or use "Enter manually" to submit without signing in.');
    this.name = 'FlyerSignInRequired';
  }
}

/**
 * Upload a flyer through the secure upload endpoint (type sniffed and size
 * checked on the server; stored under a per-user prefix). Visitors never write
 * to storage directly.
 */
export async function uploadFlyerFile(file: File): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new FlyerSignInRequired();
  const form = new FormData();
  form.append('file', file);
  const { data, error } = await supabase.functions.invoke('upload-flyer', { body: form });
  if (error) {
    let msg = error.message;
    const ctx = (error as { context?: Response }).context;
    try {
      const parsed = ctx && typeof ctx.json === 'function' ? await ctx.clone().json() : null;
      if (parsed?.error) msg = parsed.error;
    } catch { /* ignore */ }
    throw new Error(`Upload failed: ${msg}`);
  }
  if (!data?.url) throw new Error('Upload failed: no file address returned');
  return data.url as string;
}
