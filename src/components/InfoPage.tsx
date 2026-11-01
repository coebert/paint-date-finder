import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { RouteHead } from '@/components/RouteHead';

export function InfoPage({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <RouteHead title={title} description={description} />
      <main className="container max-w-2xl py-8 space-y-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground min-h-11">
          <ArrowLeft className="h-4 w-4" /> Back to events
        </Link>
        <h1 className="font-display text-4xl tracking-wide">{title}</h1>
        <div className="space-y-4 text-sm leading-relaxed text-muted-foreground [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:pt-2 [&_a]:text-accent [&_a]:underline">
          {children}
        </div>
      </main>
    </div>
  );
}
