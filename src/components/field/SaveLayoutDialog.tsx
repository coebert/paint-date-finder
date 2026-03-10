import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Save } from 'lucide-react';
import { useSaveFieldLayout } from '@/hooks/useFieldLayouts';
import { Obstacle } from '@/types/fieldLayout';
import { toast } from 'sonner';

interface SaveLayoutDialogProps {
  obstacles: Obstacle[];
}

export function SaveLayoutDialog({ obstacles }: SaveLayoutDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const saveLayout = useSaveFieldLayout();

  const handleSave = () => {
    if (!name.trim()) {
      toast.error('Please enter a layout name');
      return;
    }
    if (obstacles.length === 0) {
      toast.error('Add some obstacles before saving');
      return;
    }
    const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
    saveLayout.mutate(
      { name: name.trim(), description: description.trim(), author_name: authorName.trim(), tags, obstacles },
      {
        onSuccess: () => {
          toast.success('Layout saved!');
          setOpen(false);
          setName('');
          setDescription('');
          setAuthorName('');
          setTagsInput('');
        },
        onError: () => toast.error('Failed to save layout'),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-xs gap-1">
          <Save className="w-3 h-3" /> Save
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display tracking-wider">SAVE FIELD LAYOUT</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="layout-name">Layout Name *</Label>
            <Input id="layout-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. My 5-Man Layout" maxLength={100} />
          </div>
          <div>
            <Label htmlFor="layout-author">Your Name</Label>
            <Input id="layout-author" value={authorName} onChange={(e) => setAuthorName(e.target.value)} placeholder="Optional" maxLength={50} />
          </div>
          <div>
            <Label htmlFor="layout-desc">Description</Label>
            <Textarea id="layout-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe this layout..." rows={3} maxLength={500} />
          </div>
          <div>
            <Label htmlFor="layout-tags">Tags (comma-separated)</Label>
            <Input id="layout-tags" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="e.g. speedball, 5-man, practice" maxLength={200} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saveLayout.isPending}>
              {saveLayout.isPending ? 'Saving...' : 'Save Layout'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
