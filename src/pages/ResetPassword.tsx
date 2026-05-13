import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { updatePassword, pkceClient } from '@/hooks/useAuth';
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
import { Helmet } from 'react-helmet-async';

const ResetPasswordHead = () => (
  <Helmet>
    <title>Reset password | Find A Walk-On</title>
    <meta name="description" content="Set a new password for your Find A Walk-On account to regain access to UK paintball events and team tools." />
    <meta name="robots" content="noindex,nofollow" />
    <link rel="canonical" href="https://findawalkon.com/reset-password" />
  </Helmet>
);

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
  const [recoveryAccessToken, setRecoveryAccessToken] = useState<string | null>(null);

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    let redirectTimer: ReturnType<typeof setTimeout>;

    const markSessionValid = () => {
      setIsValidSession(true);
      setIsChecking(false);
      clearTimeout(redirectTimer);
    };

    // Listen for auth state changes FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        event === 'PASSWORD_RECOVERY' ||
        event === 'SIGNED_IN' ||
        event === 'INITIAL_SESSION'
      ) {
        if (session) {
          markSessionValid();
        }
      }
    });

    const getParam = (name: string, searchParams: URLSearchParams, hashParams: URLSearchParams) => {
      return searchParams.get(name) || hashParams.get(name);
    };

    const handleRecovery = async () => {
      const url = new URL(window.location.href);
      const searchParams = url.searchParams;
      const hashParams = new URLSearchParams(window.location.hash.substring(1));

      // 1) Handle auth errors from redirect params
      const authError = getParam('error', searchParams, hashParams);
      if (authError) {
        setIsChecking(false);
        return;
      }

      // 2) PKCE flow: exchange code for session using PKCE client
      const code = searchParams.get('code');
      if (code) {
        try {
          // Try PKCE client first (has the code_verifier from the reset request)
          const { data, error } = await pkceClient.auth.exchangeCodeForSession(code);
          if (!error && data.session) {
            // Also set the session on the main client
            await supabase.auth.setSession({
              access_token: data.session.access_token,
              refresh_token: data.session.refresh_token,
            });
            markSessionValid();
            window.history.replaceState({}, '', window.location.pathname);
            return;
          }
        } catch (e) {
          console.error('PKCE code exchange failed:', e);
          // Fallback: try main client
          try {
            const { data, error } = await supabase.auth.exchangeCodeForSession(code);
            if (!error && data.session) {
              markSessionValid();
              window.history.replaceState({}, '', window.location.pathname);
              return;
            }
          } catch (e2) {
            console.error('Fallback code exchange failed:', e2);
          }
        }
      }

      // 3) Direct token flow: support both query + hash tokens
      const accessToken = getParam('access_token', searchParams, hashParams);
      const refreshToken = getParam('refresh_token', searchParams, hashParams);
      const type = getParam('type', searchParams, hashParams);

      if (accessToken && type === 'recovery') {
        setRecoveryAccessToken(accessToken);

        // Some clients provide access token without refresh token.
        // Allow password form and use token-based fallback update on submit.
        if (!refreshToken) {
          setIsValidSession(true);
          setIsChecking(false);
          return;
        }

        try {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (!error && data.session) {
            markSessionValid();
            window.history.replaceState({}, '', window.location.pathname);
            return;
          }
        } catch (e) {
          console.error('Token session failed:', e);
        }
      }

      // 4) Token-hash flow fallback
      const tokenHash = searchParams.get('token_hash') || hashParams.get('token_hash');
      if (tokenHash && type === 'recovery') {
        try {
          const { data, error } = await supabase.auth.verifyOtp({
            type: 'recovery',
            token_hash: tokenHash,
          });

          if (!error && data.session) {
            markSessionValid();
            window.history.replaceState({}, '', window.location.pathname);
            return;
          }
        } catch (e) {
          console.error('Token hash verification failed:', e);
        }
      }

      // 5) Poll for session briefly in case auth initialization is delayed in mobile browsers
      const start = Date.now();
      const poll = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          markSessionValid();
          return;
        }

        if (Date.now() - start < 12000) {
          redirectTimer = setTimeout(poll, 500);
        } else {
          setIsChecking(false);
        }
      };

      poll();
    };

    handleRecovery();

    return () => {
      subscription.unsubscribe();
      clearTimeout(redirectTimer);
    };
  }, []);

  const onSubmit = async (data: ResetPasswordFormData) => {
    setIsLoading(true);
    try {
      try {
        await updatePassword(data.password);
      } catch (error: any) {
        // Fallback for recovery links that provide access token without full session
        if (!recoveryAccessToken) throw error;

        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/auth/v1/user`, {
          method: 'PUT',
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${recoveryAccessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ password: data.password }),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload?.msg || payload?.error_description || payload?.error || 'Failed to update password');
        }
      }

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
              <h1 className="font-display text-xl tracking-wide">INVALID OR EXPIRED LINK</h1>
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
              <h1 className="font-display text-2xl tracking-wide">PASSWORD UPDATED</h1>
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
          <h1 className="font-display text-2xl tracking-wide leading-none">SET NEW PASSWORD</h1>
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
