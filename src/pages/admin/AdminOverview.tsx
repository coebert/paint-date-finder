import { AdminLayout } from "@/layouts/AdminLayout";
import { AdminAnalytics } from "@/components/AdminAnalytics";
import { DataCompletenessCard } from "@/components/DataCompletenessCard";
import { FeedFreshnessCard } from "@/components/FeedFreshnessCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Calendar, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useSubmissions } from "@/hooks/useSubmissions";
import { useEvents } from "@/hooks/useEvents";

export default function AdminOverview() {
  const { data: submissions } = useSubmissions();
  const { data: events } = useEvents({});

  const pendingSubmissions = submissions?.filter(s => s.status === 'pending').length || 0;
  const totalEvents = events?.length || 0;

  return (
    <AdminLayout title="DASHBOARD OVERVIEW" description="Monitor platform activity and manage content">
      {/* Quick Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <FeedFreshnessCard />
        <Card className="bg-card border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Submissions
            </CardTitle>
            <FileText className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{pendingSubmissions}</div>
            <Button variant="link" className="px-0 text-accent" asChild>
              <Link to="/admin/submissions" className="flex items-center gap-1">
                Review submissions <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Events
            </CardTitle>
            <Calendar className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{totalEvents}</div>
            <Button variant="link" className="px-0 text-accent" asChild>
              <Link to="/admin/events" className="flex items-center gap-1">
                Manage events <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <DataCompletenessCard />
      </div>

      {/* Full Analytics Section */}
      <AdminAnalytics />
    </AdminLayout>
  );
}
