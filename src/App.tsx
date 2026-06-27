import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Teams from "./pages/Teams";
import TeamDetail from "./pages/TeamDetail";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import { AdminRoute } from "./components/AdminRoute";
import AdminOverview from "./pages/admin/AdminOverview";
import AdminSubmissions from "./pages/admin/AdminSubmissions";
import AdminEvents from "./pages/admin/AdminEvents";
import AdminTeams from "./pages/admin/AdminTeams";
import AdminFlags from "./pages/admin/AdminFlags";
import AdminScraper from "./pages/admin/AdminScraper";
import AdminBulkImport from "./pages/admin/AdminBulkImport";
import AdminVitals from "./pages/admin/AdminVitals";
import AdminTypography from "./pages/admin/AdminTypography";
import AdminSEO from "./pages/admin/AdminSEO";
import FieldLayout from "./pages/FieldLayout";
import EventDetail from "./pages/EventDetail";
import LookingForGame from "./pages/LookingForGame";
import VenueProfile from "./pages/VenueProfile";
import AdminVenues from "./pages/admin/AdminVenues";
import AdminPlayerPosts from "./pages/admin/AdminPlayerPosts";
import AdminRecaps from "./pages/admin/AdminRecaps";
import RegionsIndex from "./pages/RegionsIndex";
import RegionPage from "./pages/RegionPage";
import AdminGscRegions from "./pages/admin/AdminGscRegions";
import AdminRegionAudit from "./pages/admin/AdminRegionAudit";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
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
          <Route path="/paintball/:slug" element={<RegionPage />} />
          
          
          {/* Admin Routes */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminOverview />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/submissions"
            element={
              <AdminRoute>
                <AdminSubmissions />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/events"
            element={
              <AdminRoute>
                <AdminEvents />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/teams"
            element={
              <AdminRoute>
                <AdminTeams />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/flags"
            element={
              <AdminRoute>
                <AdminFlags />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/scraper"
            element={
              <AdminRoute>
                <AdminScraper />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/bulk-import"
            element={
              <AdminRoute>
                <AdminBulkImport />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/vitals"
            element={
              <AdminRoute>
                <AdminVitals />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/typography"
            element={
              <AdminRoute>
                <AdminTypography />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/seo"
            element={
              <AdminRoute>
                <AdminSEO />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/gsc-regions"
            element={<AdminRoute><AdminGscRegions /></AdminRoute>}
          />
          <Route
            path="/admin/region-audit"
            element={<AdminRoute><AdminRegionAudit /></AdminRoute>}
          />
          
          
          <Route
            path="/admin/venues"
            element={<AdminRoute><AdminVenues /></AdminRoute>}
          />
          <Route
            path="/admin/player-posts"
            element={<AdminRoute><AdminPlayerPosts /></AdminRoute>}
          />
          <Route
            path="/admin/recaps"
            element={<AdminRoute><AdminRecaps /></AdminRoute>}
          />

          {/* Legacy route redirect */}
          <Route
            path="/submissions"
            element={
              <AdminRoute>
                <AdminSubmissions />
              </AdminRoute>
            }
          />
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
