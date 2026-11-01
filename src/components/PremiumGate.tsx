import { ReactNode, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Lock, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { usePremium } from '@/hooks/usePremium';

const BENEFITS = [
  'Design your own field with every bunker type',
  'Annotate plays: lanes, snap shots and player numbers',
  'Save, share and browse community layouts',
  'One purchase, unlocked on all your devices',
];

export function PremiumGate({ children, feature }: { children: ReactNode; feature: string }) {
  const { isPremium, loading, price, storeReady, purchase, restore } = usePremium();
  const [busy, setBusy] = useState<'buy' | 'restore' | null>(null);

  if (isPremium) return <>{children}</>;
  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>;

  const run = async (kind: 'buy' | 'restore') => {
    setBusy(kind);
    try {
      const ok = kind === 'buy' ? await purchase() : await restore();
      if (ok) toast.success('Premium unlocked. Enjoy!');
      else if (kind === 'restore') toast.error('No previous purchase found for this Apple ID.');
    } catch (e: any) {
      if (!e?.userCancelled) toast.error('The purchase could not be completed. You have not been charged.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card className="bg-card border-border/50 max-w-lg mx-auto">
      <CardContent className="p-6 space-y-5">
        <div className="flex items-center gap-3">
          <Lock className="h-5 w-5 text-accent" />
          <h2 className="font-display text-2xl tracking-wider">{feature} · Premium</h2>
        </div>
        <ul className="space-y-2 text-sm">
          {BENEFITS.map((b) => (
            <li key={b} className="flex gap-2"><Check className="h-4 w-4 text-accent shrink-0 mt-0.5" />{b}</li>
          ))}
        </ul>
        <Button className="w-full min-h-11" disabled={!storeReady || !price || !!busy} onClick={() => run('buy')}>
          {busy === 'buy' ? <Loader2 className="h-4 w-4 animate-spin" /> : price ? `Unlock Premium · ${price}` : 'Coming soon'}
        </Button>
        <Button variant="ghost" className="w-full min-h-11" disabled={!storeReady || !!busy} onClick={() => run('restore')}>
          {busy === 'restore' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Restore purchases'}
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          One-off payment through your Apple ID. See our <Link to="/privacy" className="underline">Privacy Policy</Link> and{' '}
          <a href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/" className="underline">Terms of Use</a>.
        </p>
      </CardContent>
    </Card>
  );
}
