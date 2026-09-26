'use client';

import { useState } from 'react';
import { Loader2, AlertCircle, Mail, Lock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/context/AuthContext';
import { Logo, Squiggles } from '@/components/brand';
import { loginErrorMessage } from '@/lib/auth-errors';

export default function LoginPage() {
  const { login, isLoading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login({ email, password });
    } catch (err: unknown) {
      setError(loginErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-page relative">
      <Squiggles isSplashScreen />
      <div className="flex items-center justify-center min-h-screen px-4 py-12 relative z-10">
        <Card className="w-full max-w-md" padding="sheet">
          <div className="text-center mb-8">
            <Logo size={56} className="mx-auto mb-4" />
            <h1 className="text-title font-bold text-ink-primary">Croe Operations</h1>
            <p className="text-body text-ink-secondary mt-2">Sign in to access the reviewer console.</p>
          </div>

          <form suppressHydrationWarning onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-state-danger-wash text-state-danger-deep rounded-r-2 text-caption">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              autoComplete="email"
              leftElement={<Mail className="w-5 h-5" />}
              disabled={isLoading || authLoading}
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              leftElement={<Lock className="w-5 h-5" />}
              disabled={isLoading || authLoading}
            />

            <Button
              type="submit"
              className="w-full"
              size="lg"
              loading={isLoading || authLoading}
            >
              Sign in
            </Button>
          </form>

          <p className="text-caption text-ink-tertiary text-center mt-6">
            Forgot password? Contact system administrator.
          </p>
        </Card>
      </div>
    </div>
  );
}
