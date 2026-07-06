import { format, isValid, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Pencil, Save, X } from 'lucide-react';
import type { EventSubmission } from '@/types/submissions';
import type { EditDraft, Issue } from './types';

interface Props {
  submission: EventSubmission;
  issues: Issue[];
  selected: boolean;
  onToggle: () => void;
  isEditing: boolean;
  editDraft: EditDraft;
  setEditDraft: (updater: (d: EditDraft) => EditDraft) => void;
  savingEdit: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  publishing: boolean;
}

export function SubmissionRow({
  submission: s,
  issues,
  selected,
  onToggle,
  isEditing,
  editDraft,
  setEditDraft,
  savingEdit,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  publishing,
}: Props) {
  const invalid = issues.length > 0;
  const dateStr = isValid(parseISO(s.event_date))
    ? format(parseISO(s.event_date), 'dd/MM/yyyy')
    : s.event_date || '—';

  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-md border ${
        invalid ? 'border-destructive/40 bg-destructive/5' : 'border-border/50'
      }`}
    >
      <Checkbox
        className="mt-1"
        disabled={invalid || isEditing}
        checked={selected}
        onCheckedChange={onToggle}
      />
      <div className="flex-1 min-w-0 space-y-1">
        {isEditing ? (
          <div className="space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="space-y-1 md:col-span-2">
                <Label className="text-xs">Title</Label>
                <Input
                  value={editDraft.title}
                  onChange={(e) => setEditDraft((d) => ({ ...d, title: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Venue</Label>
                <Input
                  value={editDraft.venue_name}
                  onChange={(e) => setEditDraft((d) => ({ ...d, venue_name: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Date</Label>
                <Input
                  type="date"
                  value={editDraft.event_date}
                  onChange={(e) => setEditDraft((d) => ({ ...d, event_date: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                onClick={onSaveEdit}
                disabled={savingEdit}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Save className="h-3.5 w-3.5 mr-1" /> Save
              </Button>
              <Button size="sm" variant="outline" onClick={onCancelEdit} disabled={savingEdit}>
                <X className="h-3.5 w-3.5 mr-1" /> Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium truncate">{s.title}</span>
              <Badge variant="outline" className="text-xs">
                {s.event_type}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {dateStr}
              </Badge>
              {s.start_time && (
                <span className="text-xs text-muted-foreground">{s.start_time.slice(0, 5)}</span>
              )}
            </div>
            <div className="text-xs text-muted-foreground truncate">
              {s.venue_name}
              {s.venue_location ? ` · ${s.venue_location}` : ''}
            </div>
            <div className="text-xs text-muted-foreground truncate">
              From {s.submitter_name || s.submitter_email}
              {s.source_url && (
                <>
                  {' · '}
                  <a href={s.source_url} target="_blank" rel="noreferrer" className="underline">
                    source
                  </a>
                </>
              )}
            </div>
            {invalid && (
              <div className="flex flex-wrap gap-1 pt-1">
                {issues.map((i) => (
                  <Badge key={i.field} variant="destructive" className="text-[10px]">
                    {i.message}
                  </Badge>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      {!isEditing && (
        <Button
          size="sm"
          variant="ghost"
          onClick={onStartEdit}
          disabled={publishing}
          className="shrink-0"
        >
          <Pencil className="h-3.5 w-3.5 mr-1" />
          Edit
        </Button>
      )}
    </div>
  );
}
