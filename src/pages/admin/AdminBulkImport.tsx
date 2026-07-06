import { AdminLayout } from '@/layouts/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Layers } from 'lucide-react';
import { useBulkImport } from './bulk-import/useBulkImport';
import { BulkImportToolbar } from './bulk-import/BulkImportToolbar';
import { BulkImportGroups } from './bulk-import/BulkImportGroups';

/**
 * Bulk Import admin page. Orchestration only — filters/actions live in
 * `BulkImportToolbar`, the grouped submission list lives in `BulkImportGroups`,
 * and all state/mutations live in the `useBulkImport` hook.
 */
export default function AdminBulkImport() {
  const b = useBulkImport();

  return (
    <AdminLayout title="Bulk Import" description="Review and publish pending submissions in batches.">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-accent" />
              Bulk Import Pending Submissions
            </CardTitle>
            <CardDescription>
              Group, filter and publish many flyer submissions to the live calendar at once. Invalid
              rows are flagged and excluded from bulk publish.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <BulkImportToolbar
              groupBy={b.groupBy}
              setGroupBy={b.setGroupBy}
              dateFrom={b.dateFrom}
              setDateFrom={b.setDateFrom}
              dateTo={b.dateTo}
              setDateTo={b.setDateTo}
              submitterFilter={b.submitterFilter}
              setSubmitterFilter={b.setSubmitterFilter}
              shown={b.enriched.length}
              totalValid={b.totalValid}
              totalInvalid={b.totalInvalid}
              chunkSize={b.chunkSize}
              setChunkSize={b.setChunkSize}
              publishing={b.publishing}
              selectedCount={b.selected.size}
              selectedValidCount={b.selectedValidCount}
              selectAllValid={b.selectAllValid}
              clearSelection={b.clearSelection}
              rejectSelected={b.rejectSelected}
              publishSelected={b.publishSelected}
              progress={b.progress}
            />
          </CardContent>
        </Card>

        {b.totalInvalid > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{b.totalInvalid} submission(s) flagged</AlertTitle>
            <AlertDescription>
              Rows with missing venues, missing/past dates, or short titles are excluded from bulk
              publish. Edit them individually on the{' '}
              <a href="/admin/submissions" className="underline">
                Submissions
              </a>{' '}
              page.
            </AlertDescription>
          </Alert>
        )}

        {b.isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : b.groups.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No pending submissions match these filters.
            </CardContent>
          </Card>
        ) : (
          <BulkImportGroups
            groups={b.groups}
            selected={b.selected}
            onToggle={b.toggle}
            onToggleGroup={b.toggleGroup}
            editingId={b.editingId}
            editDraft={b.editDraft}
            setEditDraft={b.setEditDraft}
            savingEdit={b.savingEdit}
            onStartEdit={b.startEdit}
            onCancelEdit={b.cancelEdit}
            onSaveEdit={b.saveEdit}
            publishing={b.publishing}
          />
        )}
      </div>
    </AdminLayout>
  );
}
