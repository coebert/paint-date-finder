import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertTriangle,
  CheckCircle2,
  Filter,
  XCircle,
} from 'lucide-react';
import type { BulkProgress, GroupBy } from './types';

interface Props {
  groupBy: GroupBy;
  setGroupBy: (v: GroupBy) => void;
  dateFrom: string;
  setDateFrom: (v: string) => void;
  dateTo: string;
  setDateTo: (v: string) => void;
  submitterFilter: string;
  setSubmitterFilter: (v: string) => void;
  shown: number;
  totalValid: number;
  totalInvalid: number;
  chunkSize: number;
  setChunkSize: (n: number) => void;
  publishing: boolean;
  selectedCount: number;
  selectedValidCount: number;
  selectAllValid: () => void;
  clearSelection: () => void;
  rejectSelected: () => void;
  publishSelected: () => void;
  progress: BulkProgress | null;
}

export function BulkImportToolbar({
  groupBy,
  setGroupBy,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  submitterFilter,
  setSubmitterFilter,
  shown,
  totalValid,
  totalInvalid,
  chunkSize,
  setChunkSize,
  publishing,
  selectedCount,
  selectedValidCount,
  selectAllValid,
  clearSelection,
  rejectSelected,
  publishSelected,
  progress,
}: Props) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Group by</Label>
          <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="venue">Venue</SelectItem>
              <SelectItem value="source">Source URL</SelectItem>
              <SelectItem value="event_type">Event type</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Date from</Label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Date to</Label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
        <div className="space-y-1 lg:col-span-2">
          <Label className="text-xs">Submitter (name or email)</Label>
          <Input
            placeholder="e.g. john@example.com"
            value={submitterFilter}
            onChange={(e) => setSubmitterFilter(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-2">
        <Badge variant="outline" className="gap-1">
          <Filter className="h-3 w-3" /> {shown} shown
        </Badge>
        <Badge variant="secondary" className="gap-1">
          <CheckCircle2 className="h-3 w-3" /> {totalValid} valid
        </Badge>
        {totalInvalid > 0 && (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="h-3 w-3" /> {totalInvalid} need editing
          </Badge>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Label htmlFor="chunk-size" className="text-xs whitespace-nowrap">
              Batch size
            </Label>
            <Select
              value={String(chunkSize)}
              onValueChange={(v) => setChunkSize(Number(v))}
              disabled={publishing}
            >
              <SelectTrigger id="chunk-size" className="h-8 w-[80px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" size="sm" onClick={selectAllValid} disabled={publishing}>
            Select all valid
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={clearSelection}
            disabled={publishing || selectedCount === 0}
          >
            Clear
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={rejectSelected}
            disabled={publishing || selectedCount === 0}
          >
            <XCircle className="h-4 w-4 mr-1" /> Reject ({selectedCount})
          </Button>
          <Button
            size="sm"
            onClick={publishSelected}
            disabled={publishing || selectedValidCount === 0}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <CheckCircle2 className="h-4 w-4 mr-1" />
            Publish {selectedValidCount} to calendar
          </Button>
        </div>
      </div>

      {progress && (
        <div className="space-y-2 rounded-md border border-border/60 bg-muted/30 p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium">
              {publishing
                ? `Publishing batch ${progress.currentBatch} of ${progress.totalBatches}…`
                : 'Bulk publish complete'}
            </span>
            <span className="text-muted-foreground">
              {progress.processed} / {progress.total}
            </span>
          </div>
          <Progress value={progress.total ? (progress.processed / progress.total) * 100 : 0} />
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant="secondary" className="gap-1">
              <CheckCircle2 className="h-3 w-3" /> {progress.published} published
            </Badge>
            {progress.duplicates > 0 && (
              <Badge variant="outline" className="gap-1">
                {progress.duplicates} duplicates skipped
              </Badge>
            )}
            {progress.failed > 0 && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" /> {progress.failed} failed
              </Badge>
            )}
          </div>
        </div>
      )}
    </>
  );
}
