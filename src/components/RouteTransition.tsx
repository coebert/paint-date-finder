import { useEffect, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Fade + slight lift between routes. Keyed by pathname so the
 * animation replays whenever navigation happens; keeps the app
 * feeling "app-like" without a heavy dependency.
 *
 * Respects prefers-reduced-motion via the CSS `@media` query below,
 * so motion-sensitive users still get an instant swap.
 */
export function RouteTransition({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const [key, setKey] = useState(pathname);

  useEffect(() => {
    setKey(pathname);
  }, [pathname]);

  return (
    <div key={key} className="route-transition">
      {children}
    </div>
  );
}
