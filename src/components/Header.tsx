import { useState } from 'react';
import { Calendar, List, Plus, Map, Send, Settings, LogIn, Users, LayoutGrid, Sparkles } from 'lucide-react';
import logo from '@/assets/logo.png';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { useAuth, useIsAdmin } from '@/hooks/useAuth';
import { UserMenu } from '@/components/UserMenu';
import { AuthDialog } from '@/components/AuthDialog';

interface HeaderProps {
  view: 'calendar' | 'list' | 'map';
  onViewChange: (view: 'calendar' | 'list' | 'map') => void;
  onAddEvent: () => void;
  onSubmitEvent: () => void;
  onImportFlyer: () => void;
}

export function Header({ view, onViewChange, onAddEvent, onSubmitEvent, onImportFlyer }: HeaderProps) {
  const { user, loading: authLoading } = useAuth();
  const { data: isAdmin } = useIsAdmin();
  const [authDialogOpen, setAuthDialogOpen] = useState(false);

  return (
    <header className="tactical-gradient border-b border-border/50">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src={logo}
              alt="Find A Walk-On logo"
              width={80}
              height={80}
              fetchPriority="high"
              decoding="async"
              className="w-16 h-16 md:w-20 md:h-20 drop-shadow-lg"
            />
            <div>
              <h1 className="font-display text-3xl md:text-4xl tracking-wider text-foreground">
                FIND A WALK-ON
              </h1>
              <p className="text-sm text-muted-foreground">
                Find and book paintball events across the United Kingdom
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="bg-secondary rounded-lg p-1 flex">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onViewChange('calendar')}
                className={cn(
                  'gap-2 transition-colors',
                  view === 'calendar'
                    ? 'bg-accent text-accent-foreground hover:bg-accent/90'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Calendar className="h-4 w-4" />
                Calendar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onViewChange('list')}
                className={cn(
                  'gap-2 transition-colors',
                  view === 'list'
                    ? 'bg-accent text-accent-foreground hover:bg-accent/90'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <List className="h-4 w-4" />
                List
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onViewChange('map')}
                className={cn(
                  'gap-2 transition-colors',
                  view === 'map'
                    ? 'bg-accent text-accent-foreground hover:bg-accent/90'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Map className="h-4 w-4" />
                Map
              </Button>
            </div>

            <Button variant="outline" className="gap-2" asChild>
              <Link to="/teams">
                <Users className="h-4 w-4" />
                Teams
              </Link>
            </Button>

            <Button variant="outline" className="gap-2" asChild>
              <Link to="/field-layout">
                <LayoutGrid className="h-4 w-4" />
                Field Layout
              </Link>
            </Button>

            <Button
              onClick={onImportFlyer}
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-md ring-2 ring-accent/40"
            >
              <Sparkles className="h-4 w-4" />
              Import from Flyer
            </Button>

            <Button
              onClick={onSubmitEvent}
              variant="outline"
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              Suggest an Event
            </Button>

            {/* Admin-only: Add Event button */}
            {isAdmin && (
              <Button
                onClick={onAddEvent}
                className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Event
              </Button>
            )}

            {/* Admin-only: Dashboard link */}
            {isAdmin && (
              <Button
                variant="ghost"
                size="icon"
                asChild
                className="text-muted-foreground hover:text-foreground"
              >
                <Link to="/admin">
                  <Settings className="h-4 w-4" />
                </Link>
              </Button>
            )}

            {/* Auth controls */}
            {!authLoading && (
              user ? (
                <UserMenu />
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAuthDialogOpen(true)}
                  className="gap-2 text-muted-foreground hover:text-foreground"
                >
                  <LogIn className="h-4 w-4" />
                  Admin Login
                </Button>
              )
            )}
          </div>
        </div>
      </div>

      <AuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} />
    </header>
  );
}
