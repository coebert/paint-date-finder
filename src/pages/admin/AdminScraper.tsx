import { AdminLayout } from '@/layouts/AdminLayout';
import { AdminFlyerImportCard } from '@/components/admin/AdminFlyerImportCard';
import { TrustedSourcesCard } from './scraper/TrustedSourcesCard';
import { RecentRunsCard } from './scraper/RecentRunsCard';

/**
 * Auto-scraper admin page. Orchestration only — all UI lives in the three
 * focused cards under `./scraper/`.
 */
export default function AdminScraper() {
  return (
    <AdminLayout
      title="Auto-Scraper"
      description="Scrape trusted venue websites weekly and queue new candidate events for review."
    >
      <div className="space-y-6">
        <AdminFlyerImportCard />
        <TrustedSourcesCard />
        <RecentRunsCard />
      </div>
    </AdminLayout>
  );
}
