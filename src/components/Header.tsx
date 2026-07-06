import { useState } from 'react';
import {
  Calendar,
  List,
  Plus,
  Map,
  Send,
  Settings,
  LogIn,
  Users,
  LayoutGrid,
  Sparkles,
  UserSearch,
  Menu,
} from 'lucide-react';
import { HeroLogo } from '@/components/HeroLogo';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Link, NavLink as RouterNavLink } from 'react-router-dom';
import { useAuth, useIsAdmin } from '@/hooks/useAuth';
import { UserMenu } from '@/components/UserMenu';
import { AuthDialog } from '@/components/AuthDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet';

interface HeaderProps {
  view: 'calendar' | 'list' | 'map';
  onViewChange: (view: 'calendar' | 'list' | 'map') => void;
  onAddEvent: () => void;
  onSubmitEvent: () => void;
  onImportFlyer: () => void;
}

const NAV = [
  { to: '/teams', label: 'Teams', icon: Users },
  { to: '/looking-for-a-game', label: 'Looking for a Game', icon: UserSearch },
  { to: '/field-layout', label: 'Field Layout', icon: LayoutGrid },
] as const;

function ViewToggle({
  view,
  onViewChange,
  size = 'sm',
}: {
  view: HeaderProps['view'];
  onViewChange: HeaderProps['onViewChange'];
  size?: 'sm' | 'md';
}) {
  const items: Array<{ id: HeaderProps['view']; label: string; Icon: typeof Calendar }> = [
    { id: 'calendar', label: 'Calendar', Icon: Calendar },
    { id: 'list', label: 'List', Icon: List },
    { id: 'map', label: 'Map', Icon: Map },
  ];
  return (
    <div
      role="tablist"
      aria-label="Change events view"
      className={cn(
        'inline-flex items-center rounded-lg bg-secondary/80 p-1 backdrop-blur',
        size === 'md' && 'p-1.5',
      )}
    >
      {items.map(({ id, label, Icon }) => {
        const active = view === id;
        return (
          <button
            key={id}
            role="tab"
            aria-selected={active}
            onClick={() => onViewChange(id)}
            className={cn(
              'inline-flex items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              size === 'sm' ? 'h-9' : 'h-11 min-w-11',
              active
                ? 'bg-accent text-accent-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function Header({
  view,
  onViewChange,
  onAddEvent,
  onSubmitEvent,
  onImportFlyer,
}: HeaderProps) {
  const { user, loading: authLoading } = useAuth();
  const { data: isAdmin } = useIsAdmin();
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center gap-3 px-4">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-2 shrink-0" aria-label="Find A Walk-On — home">
            <HeroLogo displayWidth={40} className="h-10 w-10 drop-shadow" />
            <span className="font-display text-xl tracking-wider text-foreground hidden sm:inline">
              FIND A WALK-ON
            </span>
          </Link>

          {/* Desktop primary nav */}
          <nav aria-label="Primary" className="ml-4 hidden lg:flex items-center gap-1">
            {NAV.map(({ to, label }) => (
              <RouterNavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    'px-3 h-9 inline-flex items-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    isActive
                      ? 'text-foreground bg-secondary/70'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40',
                  )
                }
              >
                {label}
              </RouterNavLink>
            ))}
          </nav>

          <div className="flex-1" />

          {/* Desktop view toggle */}
          <div className="hidden md:block">
            <ViewToggle view={view} onViewChange={onViewChange} />
          </div>

          {/* + Add event split button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm min-h-9"
              >
                <Plus className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">Add event</span>
                <span className="sm:hidden sr-only">Add event</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onSelect={onImportFlyer} className="gap-2">
                <Sparkles className="h-4 w-4 text-accent" aria-hidden />
                <div className="flex flex-col">
                  <span>Import from flyer</span>
                  <span className="text-xs text-muted-foreground">AI extracts the details</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onSubmitEvent} className="gap-2">
                <Send className="h-4 w-4" aria-hidden />
                <span>Suggest an event</span>
              </DropdownMenuItem>
              {isAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={onAddEvent} className="gap-2">
                    <Plus className="h-4 w-4" aria-hidden />
                    <span>Add event (admin)</span>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Auth / admin */}
          {!authLoading && (
            <div className="hidden md:flex items-center gap-1">
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="icon"
                  asChild
                  className="text-muted-foreground hover:text-foreground min-h-11 min-w-11"
                >
                  <Link to="/admin" aria-label="Admin dashboard">
                    <Settings className="h-4 w-4" />
                  </Link>
                </Button>
              )}
              {user ? (
                <UserMenu />
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAuthDialogOpen(true)}
                  className="gap-2 text-muted-foreground hover:text-foreground"
                >
                  <LogIn className="h-4 w-4" aria-hidden />
                  <span>Sign in</span>
                </Button>
              )}
            </div>
          )}

          {/* Mobile menu */}
          <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden min-h-11 min-w-11"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[85vw] max-w-sm">
              <SheetHeader>
                <SheetTitle className="font-display tracking-wider">Menu</SheetTitle>
              </SheetHeader>
              <nav aria-label="Mobile" className="mt-6 flex flex-col gap-1">
                {NAV.map(({ to, label, icon: Icon }) => (
                  <SheetClose asChild key={to}>
                    <Link
                      to={to}
                      className="flex items-center gap-3 rounded-md px-3 h-12 text-base font-medium text-foreground hover:bg-secondary/60"
                    >
                      <Icon className="h-5 w-5 text-muted-foreground" aria-hidden />
                      {label}
                    </Link>
                  </SheetClose>
                ))}
                <div className="my-3 h-px bg-border/60" />
                <SheetClose asChild>
                  <button
                    onClick={onImportFlyer}
                    className="flex items-center gap-3 rounded-md px-3 h-12 text-base font-medium text-foreground hover:bg-secondary/60 text-left"
                  >
                    <Sparkles className="h-5 w-5 text-accent" aria-hidden />
                    Import from flyer
                  </button>
                </SheetClose>
                <SheetClose asChild>
                  <button
                    onClick={onSubmitEvent}
                    className="flex items-center gap-3 rounded-md px-3 h-12 text-base font-medium text-foreground hover:bg-secondary/60 text-left"
                  >
                    <Send className="h-5 w-5 text-muted-foreground" aria-hidden />
                    Suggest an event
                  </button>
                </SheetClose>
                {isAdmin && (
                  <>
                    <div className="my-3 h-px bg-border/60" />
                    <SheetClose asChild>
                      <Link
                        to="/admin"
                        className="flex items-center gap-3 rounded-md px-3 h-12 text-base font-medium text-foreground hover:bg-secondary/60"
                      >
                        <Settings className="h-5 w-5 text-muted-foreground" aria-hidden />
                        Admin dashboard
                      </Link>
                    </SheetClose>
                  </>
                )}
                {!authLoading && !user && (
                  <SheetClose asChild>
                    <button
                      onClick={() => setAuthDialogOpen(true)}
                      className="flex items-center gap-3 rounded-md px-3 h-12 text-base font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 text-left"
                    >
                      <LogIn className="h-5 w-5" aria-hidden />
                      Sign in
                    </button>
                  </SheetClose>
                )}
                {!authLoading && user && (
                  <div className="px-3 pt-2">
                    <UserMenu />
                  </div>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>

        {/* Mobile view toggle row */}
        <div className="md:hidden container mx-auto px-4 pb-3">
          <ViewToggle view={view} onViewChange={onViewChange} size="md" />
        </div>
      </header>

      <AuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} />
    </>
  );
}
