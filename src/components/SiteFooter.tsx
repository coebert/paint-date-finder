import { Link, useLocation } from 'react-router-dom';

/** Public footer with support and privacy links (hidden in admin pages). */
export function SiteFooter() {
  const { pathname } = useLocation();
  if (pathname.startsWith('/admin') || pathname === '/submissions') return null;
  return (
    <footer className="border-t border-border/50 mt-12">
      <nav
        aria-label="Footer"
        className="container mx-auto px-4 py-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground"
      >
        <span>© {new Date().getFullYear()} Find A Walk-On</span>
        <Link to="/support" className="hover:text-foreground min-h-11 inline-flex items-center">Support</Link>
        <Link to="/privacy" className="hover:text-foreground min-h-11 inline-flex items-center">Privacy Policy</Link>
      </nav>
    </footer>
  );
}
