import { BarChart3, Calendar, FileText, Flag, Home, Radar, Settings, Users, Layers, Activity, Type, Search, MapPin, UserSearch, Camera, Globe, ClipboardCheck, Trophy } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useLatestRegionAuditRun } from "@/pages/admin/AdminRegionAudit";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";

const LAST_SEEN_KEY = "region-audit:last-seen-fingerprint";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Crosshair } from "lucide-react";

const menuItems = [
  { title: "Overview", url: "/admin", icon: BarChart3 },
  { title: "Submissions", url: "/admin/submissions", icon: FileText },
  { title: "Bulk Import", url: "/admin/bulk-import", icon: Layers },
  { title: "Events", url: "/admin/events", icon: Calendar },
  { title: "Venues", url: "/admin/venues", icon: MapPin },
  { title: "Recaps", url: "/admin/recaps", icon: Camera },
  { title: "Player Posts", url: "/admin/player-posts", icon: UserSearch },
  { title: "Flags", url: "/admin/flags", icon: Flag },
  { title: "Teams", url: "/admin/teams", icon: Users },
  { title: "CPPS Rounds", url: "/admin/cpps-rounds", icon: Trophy },
  { title: "Auto-Scraper", url: "/admin/scraper", icon: Radar },
  { title: "Web Vitals", url: "/admin/vitals", icon: Activity },
  { title: "SEO Monitor", url: "/admin/seo", icon: Search },
  { title: "GSC Regions", url: "/admin/gsc-regions", icon: Globe },
  { title: "Region Audit", url: "/admin/region-audit", icon: ClipboardCheck },
  { title: "Typography QA", url: "/admin/typography", icon: Type },
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { data: latestAudit } = useLatestRegionAuditRun();
  const [lastSeen, setLastSeen] = useState<string | null>(() =>
    typeof window === "undefined" ? null : localStorage.getItem(LAST_SEEN_KEY),
  );
  useEffect(() => {
    const onStorage = () => setLastSeen(localStorage.getItem(LAST_SEEN_KEY));
    window.addEventListener("storage", onStorage);
    const interval = window.setInterval(onStorage, 5000);
    return () => { window.removeEventListener("storage", onStorage); window.clearInterval(interval); };
  }, []);
  const auditNewCount = (() => {
    if (!latestAudit || !lastSeen) return 0;
    if (latestAudit.fingerprint === lastSeen) return 0;
    const prev = new Set(lastSeen.split("|").filter(Boolean));
    const current = latestAudit.rows.flatMap((r) => r.issues.map((i: { code: string }) => `${r.slug}:${i.code}`));
    return current.filter((c) => !prev.has(c)).length;
  })();

  const isActive = (path: string) => {
    if (path === "/admin") {
      return location.pathname === "/admin";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border/50">
      <SidebarHeader className="border-b border-border/50 p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
            <Crosshair className="w-5 h-5 text-accent-foreground" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <h2 className="font-display text-sm tracking-wider text-foreground truncate">
                ADMIN PANEL
              </h2>
              <p className="text-xs text-muted-foreground">Management Dashboard</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const showBadge = item.url === "/admin/region-audit" && auditNewCount > 0;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.url)}
                      tooltip={showBadge ? `${item.title} (${auditNewCount} new)` : item.title}
                    >
                      <NavLink
                        to={item.url}
                        end={item.url === "/admin"}
                        className="flex items-center gap-2"
                        activeClassName="bg-accent text-accent-foreground"
                      >
                        <item.icon className="h-4 w-4" />
                        <span className="flex-1">{item.title}</span>
                        {showBadge && !collapsed && (
                          <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">{auditNewCount}</Badge>
                        )}
                        {showBadge && collapsed && (
                          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive" aria-label={`${auditNewCount} new`} />
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Quick Links</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Back to Site">
                  <NavLink to="/" className="flex items-center gap-2">
                    <Home className="h-4 w-4" />
                    <span>Back to Site</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border/50 p-4">
        {!collapsed && (
          <p className="text-xs text-muted-foreground text-center">
            UK Paintball Events Admin
          </p>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
