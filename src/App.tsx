import { lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { Loader2 } from "lucide-react";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { AdminRoute } from "./components/AdminRoute";
import { RouteTransition } from "./components/RouteTransition";

// Public routes — lazy-loaded except the landing page (which is the LCP target).
const Teams = lazy(() => import("./pages/Teams"));
const TeamDetail = lazy(() => import("./pages/TeamDetail"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const FieldLayout = lazy(() => import("./pages/FieldLayout"));
const EventDetail = lazy(() => import("./pages/EventDetail"));
const LookingForGame = lazy(() => import("./pages/LookingForGame"));
const VenueProfile = lazy(() => import("./pages/VenueProfile"));
const RegionsIndex = lazy(() => import("./pages/RegionsIndex"));
const RegionPage = lazy(() => import("./pages/RegionPage"));
const CityPage = lazy(() => import("./pages/CityPage"));

// Admin routes — split into their own chunk so normal visitors never download them.
const AdminOverview = lazy(() => import("./pages/admin/AdminOverview"));
const AdminSubmissions = lazy(() => import("./pages/admin/AdminSubmissions"));
const AdminEvents = lazy(() => import("./pages/admin/AdminEvents"));
const AdminTeams = lazy(() => import("./pages/admin/AdminTeams"));
const AdminFlags = lazy(() => import("./pages/admin/AdminFlags"));
const AdminScraper = lazy(() => import("./pages/admin/AdminScraper"));
const AdminBulkImport = lazy(() => import("./pages/admin/AdminBulkImport"));
const AdminVitals = lazy(() => import("./pages/admin/AdminVitals"));
const AdminTypography = lazy(() => import("./pages/admin/AdminTypography"));
const AdminSEO = lazy(() => import("./pages/admin/AdminSEO"));
const AdminVenues = lazy(() => import("./pages/admin/AdminVenues"));
const AdminPlayerPosts = lazy(() => import("./pages/admin/AdminPlayerPosts"));
const AdminRecaps = lazy(() => import("./pages/admin/AdminRecaps"));
const AdminGscRegions = lazy(() => import("./pages/admin/AdminGscRegions"));
const AdminRegionAudit = lazy(() => import("./pages/admin/AdminRegionAudit"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

function RouteFallback() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-accent" />
    </div>
  );
}

/**
 * Wrapper that gates every nested admin route behind AdminRoute + Suspense.
 * Lets us declare the admin section once instead of repeating <AdminRoute>
 * on every child <Route>.
 */
function AdminSection() {
  return (
    <AdminRoute>
      <Suspense fallback={<RouteFallback />}>
        <Outlet />
      </Suspense>
    </AdminRoute>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<RouteFallback />}>
          <RouteTransition>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/teams" element={<Teams />} />
            <Route path="/teams/:id" element={<TeamDetail />} />
            <Route path="/field-layout" element={<FieldLayout />} />
            <Route path="/events/:id" element={<EventDetail />} />
            <Route path="/venues/:slug" element={<VenueProfile />} />
            <Route path="/looking-for-a-game" element={<LookingForGame />} />
            <Route path="/paintball" element={<RegionsIndex />} />
            <Route path="/paintball/city/:slug" element={<CityPage />} />
            <Route path="/paintball/:slug" element={<RegionPage />} />

            {/* Admin section — one guard, nested routes below */}
            <Route element={<AdminSection />}>
              <Route path="/admin" element={<AdminOverview />} />
              <Route path="/admin/submissions" element={<AdminSubmissions />} />
              <Route path="/admin/events" element={<AdminEvents />} />
              <Route path="/admin/teams" element={<AdminTeams />} />
              <Route path="/admin/flags" element={<AdminFlags />} />
              <Route path="/admin/scraper" element={<AdminScraper />} />
              <Route path="/admin/bulk-import" element={<AdminBulkImport />} />
              <Route path="/admin/vitals" element={<AdminVitals />} />
              <Route path="/admin/typography" element={<AdminTypography />} />
              <Route path="/admin/seo" element={<AdminSEO />} />
              <Route path="/admin/gsc-regions" element={<AdminGscRegions />} />
              <Route path="/admin/region-audit" element={<AdminRegionAudit />} />
              <Route path="/admin/venues" element={<AdminVenues />} />
              <Route path="/admin/player-posts" element={<AdminPlayerPosts />} />
              <Route path="/admin/recaps" element={<AdminRecaps />} />
              {/* Legacy redirect target */}
              <Route path="/submissions" element={<AdminSubmissions />} />
            </Route>

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </RouteTransition>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
