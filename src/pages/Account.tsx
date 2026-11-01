import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { InfoPage } from '@/components/InfoPage';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth, signOut } from '@/hooks/useAuth';

export default function Account() {
  const { user, loading } = useAuth();
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const handleDelete = async () => {
    setBusy(true);
    const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
    if (error) {
      setBusy(false);
      toast.error('Could not delete your account. Please try again or contact support.');
      return;
    }
    await signOut().catch(() => {});
    toast.success('Your account has been deleted.');
    navigate('/');
  };

  return (
    <InfoPage title="Account" description="Manage your Find A Walk-On account.">
      {loading ? null : !user ? (
        <p>You are not signed in. Sign in from the top of the home page to manage your account.</p>
      ) : (
        <>
          <p>Signed in as <strong className="text-foreground">{user.email}</strong></p>
          <h2>Delete account</h2>
          <p>This permanently removes your account and personal data. It cannot be undone. Events you submitted stay listed, but without your details.</p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="min-h-11" disabled={busy}>Delete my account</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                <AlertDialogDescription>This permanently removes your account. You can't undo this.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Delete permanently</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </InfoPage>
  );
}
