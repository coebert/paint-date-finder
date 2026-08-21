import { AdminLayout } from '@/layouts/AdminLayout';
import { AdminFlyerImportCard } from '@/components/admin/AdminFlyerImportCard';
import { ScheduleStatusCard } from './scraper/ScheduleStatusCard';
import { TrustedSourcesCard } from './scraper/TrustedSourcesCard';
import { RecentRunsCard } from './scraper/RecentRunsCard';

/**
 * Auto-scraper admin page. Orchestration only — all UI lives in the focused
 * cards under `./scraper/`.
 */
export default function AdminScraper() {
  return (
    <AdminLayout
      title="Auto-Scraper"
      description="Automatically scrapes trusted venue sources every day and queues new candidate events for review."
    >
      <div className="space-y-6">
        <ScheduleStatusCard />
        <AdminFlyerImportCard />
        <TrustedSourcesCard />
        <RecentRunsCard />
      </div>
    </AdminLayout>
  );
}

