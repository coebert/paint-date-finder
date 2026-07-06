import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle } from 'lucide-react';
import { SubmissionRow } from './SubmissionRow';
import type { EditDraft, EnrichedRow } from './types';
import type { EventSubmission } from '@/types/submissions';

interface Props {
  groups: [string, EnrichedRow[]][];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleGroup: (rows: EnrichedRow[], on: boolean) => void;
  editingId: string | null;
  editDraft: EditDraft;
  setEditDraft: (updater: (d: EditDraft) => EditDraft) => void;
  savingEdit: boolean;
  onStartEdit: (s: EventSubmission) => void;
  onCancelEdit: () => void;
  onSaveEdit: (id: string) => void;
  publishing: boolean;
}

export function BulkImportGroups({
  groups,
  selected,
  onToggle,
  onToggleGroup,
  editingId,
  editDraft,
  setEditDraft,
  savingEdit,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  publishing,
}: Props) {
  return (
    <Accordion type="multiple" className="space-y-2">
      {groups.map(([groupKey, rows]) => {
        const validInGroup = rows.filter((r) => r.issues.length === 0);
        const allSelected =
          validInGroup.length > 0 && validInGroup.every((r) => selected.has(r.s.id));
        return (
          <AccordionItem key={groupKey} value={groupKey} className="border rounded-lg bg-card">
            <AccordionTrigger className="px-4 hover:no-underline">
              <div className="flex items-center gap-3 flex-1 text-left">
                <span className="font-medium truncate max-w-md">{groupKey}</span>
                <Badge variant="secondary">{rows.length}</Badge>
                {rows.some((r) => r.issues.length > 0) && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {rows.filter((r) => r.issues.length > 0).length}
                  </Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 space-y-2">
              {validInGroup.length > 0 && (
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={(c) => onToggleGroup(rows, !!c)}
                  />
                  <span className="text-xs text-muted-foreground">
                    Select all {validInGroup.length} valid in this group
                  </span>
                </div>
              )}
              {rows.map(({ s, issues }) => (
                <SubmissionRow
                  key={s.id}
                  submission={s}
                  issues={issues}
                  selected={selected.has(s.id)}
                  onToggle={() => onToggle(s.id)}
                  isEditing={editingId === s.id}
                  editDraft={editDraft}
                  setEditDraft={setEditDraft}
                  savingEdit={savingEdit}
                  onStartEdit={() => onStartEdit(s)}
                  onCancelEdit={onCancelEdit}
                  onSaveEdit={() => onSaveEdit(s.id)}
                  publishing={publishing}
                />
              ))}
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
