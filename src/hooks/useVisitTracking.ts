import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

const getSessionId = () => {
  let sessionId = sessionStorage.getItem('visit_session_id');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem('visit_session_id', sessionId);
  }
  return sessionId;
};

export function useVisitTracking() {
  const { user } = useAuth();

  useEffect(() => {
    const trackVisit = async () => {
      try {
        await supabase.from('user_visits').insert({
          user_id: user?.id || null,
          session_id: getSessionId(),
          page_path: window.location.pathname,
        });
      } catch (error) {
        // Silently fail - tracking shouldn't break the app
        console.error('Visit tracking error:', error);
      }
    };

    trackVisit();
  }, [user?.id]);
}
