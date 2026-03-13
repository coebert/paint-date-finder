import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { updatePassword } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, KeyRound, CheckCircle } from 'lucide-react';

const resetPasswordSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Password must be at least 6 characters'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export default function ResetPassword() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    let redirectTimer: ReturnType<typeof setTimeout>;

    // Listen for auth state changes FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        setIsValidSession(true);
        setIsChecking(false);
        clearTimeout(redirectTimer);
      }
    });

    // Check for existing session (user may already be authenticated via the recovery link)
    const checkSession = async () => {
      // Give Supabase time to process the URL hash/tokens
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsValidSession(true);
        setIsChecking(false);
      } else {
        // Wait a bit longer for the token exchange to complete before giving up
        redirectTimer = setTimeout(() => {
          setIsChecking(false);
        }, 3000);
      }
    };

    checkSession();

    return () => {
      subscription.unsubscribe();
      clearTimeout(redirectTimer);
    };
  }, []);

  const onSubmit = async (data: ResetPasswordFormData) => {
    setIsLoading(true);
    try {
      await updatePassword(data.password);
      setIsSuccess(true);
      toast.success('Password updated successfully!');
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update password');
    } finally {
      setIsLoading(false);
    }
  };

  if (isChecking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
            </div>
            <p className="text-center text-muted-foreground mt-4">Validating reset link...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isValidSession) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              <KeyRound className="h-12 w-12 text-destructive" />
              <h2 className="font-display text-xl tracking-wide">INVALID OR EXPIRED LINK</h2>
              <p className="text-muted-foreground text-center text-sm">
                This password reset link is invalid or has expired. Please request a new one.
              </p>
              <Button
                onClick={() => navigate('/')}
                className="bg-accent text-accent-foreground hover:bg-accent/90"
              >
                Back to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              <CheckCircle className="h-16 w-16 text-primary" />
              <h2 className="font-display text-2xl tracking-wide">PASSWORD UPDATED</h2>
              <p className="text-muted-foreground text-center">
                Your password has been reset successfully. Redirecting...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-card border-border">
        <CardHeader>
          <CardTitle className="font-display text-2xl tracking-wide">SET NEW PASSWORD</CardTitle>
          <CardDescription>
            Enter your new password below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field: { ref, ...fieldProps } }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        autoFocus
                        ref={ref}
                        {...fieldProps}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field: { ref, ...fieldProps } }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        ref={ref}
                        {...fieldProps}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <KeyRound className="h-4 w-4 mr-2" />
                )}
                Update Password
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
