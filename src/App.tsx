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
import FieldLayout from "./pages/FieldLayout";

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
