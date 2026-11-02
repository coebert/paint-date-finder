import { Component, useEffect, useState, type ReactNode } from 'react';
import { Box } from 'lucide-react';

/** True only if this browser can create a WebGL context. */
export function canUseWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch {
    return false;
  }
}

function Unavailable({ reason }: { reason: 'unsupported' | 'lost' | 'error' }) {
  return (
    <div role="status" className="flex h-[400px] md:h-[500px] w-full flex-col items-center justify-center gap-2 rounded-lg border border-border/50 bg-muted/30 p-6 text-center">
      <Box className="h-8 w-8 text-muted-foreground" />
      <p className="font-medium text-foreground">3D view isn't available on this device</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        {reason === 'lost'
          ? 'Your browser stopped the 3D graphics. Reload the page to try again.'
          : 'Your browser has 3D graphics (WebGL) turned off or unsupported.'}{' '}
        The 2D layout and mini-map still work.
      </p>
    </div>
  );
}

class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(e: unknown) { console.warn('3D view failed', e); }
  render() { return this.state.failed ? <Unavailable reason="error" /> : this.props.children; }
}

/** Renders 3D content only when WebGL works; otherwise a friendly fallback. */
export function WebGLGuard({ children }: { children: ReactNode }) {
  const [supported] = useState(() => canUseWebGL());
  const [lost, setLost] = useState(false);
  useEffect(() => {
    const onLost = (e: Event) => {
      if ((e.target as HTMLElement)?.tagName === 'CANVAS') setLost(true);
    };
    document.addEventListener('webglcontextlost', onLost, true);
    return () => document.removeEventListener('webglcontextlost', onLost, true);
  }, []);
  if (!supported) return <Unavailable reason="unsupported" />;
  if (lost) return <Unavailable reason="lost" />;
  return <Boundary>{children}</Boundary>;
}
