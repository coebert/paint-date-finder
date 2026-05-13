import { ReactNode } from "react";
import { RouteHead } from "@/components/RouteHead";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { UserMenu } from "@/components/UserMenu";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useLocation, Link } from "react-router-dom";

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
  description?: string;
}

const routeTitles: Record<string, string> = {
  "/admin": "Overview",
  "/admin/submissions": "Submissions",
  "/admin/events": "Events",
  "/admin/teams": "Teams",
};

export function AdminLayout({ children, title, description }: AdminLayoutProps) {
  const location = useLocation();
  const currentTitle = routeTitles[location.pathname] || title;

  return (
    <SidebarProvider>
      <RouteHead
        title={`${title} | Admin · Find A Walk-On`}
        titleFull
        description={description || `${title} admin tools for managing the Find A Walk-On UK paintball directory.`}
        path={location.pathname}
        robots="noindex,nofollow"
      />
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar />
        <SidebarInset className="flex-1">
          <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border/50 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to="/admin">Admin</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                {location.pathname !== "/admin" && (
                  <>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage>{currentTitle}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </>
                )}
              </BreadcrumbList>
            </Breadcrumb>
            <div className="ml-auto">
              <UserMenu />
            </div>
          </header>
          <main className="flex-1 p-6">
            <div className="mb-6">
              <h1 className="font-display text-3xl tracking-wide text-foreground">{title}</h1>
              {description && (
                <p className="text-muted-foreground mt-1">{description}</p>
              )}
            </div>
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
