'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Code,
  Crown,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
} from 'lucide-react';

const PRESETS = [
  { label: 'Admin', email: 'admin@neostats.com', icon: Crown, tone: 'text-plum' },
  { label: 'Project Manager', email: 'pm@neostats.com', icon: Briefcase, tone: 'text-info' },
  { label: 'Team Member', email: 'member@neostats.com', icon: Code, tone: 'text-success' },
  { label: 'Viewer', email: 'viewer@neostats.com', icon: Eye, tone: 'text-fg-muted' },
];

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const applyPreset = (presetEmail: string) => {
    setEmail(presetEmail);
    setPassword('password123');
    setError(null);
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center p-4">
      <Link href="/" className="absolute left-6 top-6 inline-flex items-center gap-2 text-sm text-fg-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" />
        Back to home
      </Link>

      <div className="card w-full max-w-md p-8 shadow-xl">
        <div className="mb-8 text-center">
          <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl bg-fg text-lg font-bold text-canvas">
            K
          </span>
          <h1 className="text-3xl font-semibold tracking-tight text-fg">
            Welcome <em className="accent-serif">back</em>
          </h1>
          <p className="mt-2 text-sm text-fg-muted">Sign in to manage tickets, escalations and performance.</p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-6 flex items-start gap-3 rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="mb-2 block text-xs font-medium text-fg-muted">
              Email address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
              <input
                id="email"
                type="email"
                required
                autoFocus
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="input pl-11"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-xs font-medium text-fg-muted">
              Password
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                className="input pl-11 pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-fg-subtle hover:text-fg"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-3">
            {isSubmitting ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-canvas border-t-transparent" />
                Signing in...
              </>
            ) : (
              <>
                Sign in
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 border-t border-line pt-6">
          <p className="mb-3 text-center text-xs text-fg-subtle">Demo accounts: click one to fill the form</p>
          <div className="grid grid-cols-2 gap-2">
            {PRESETS.map((p) => {
              const Icon = p.icon;
              return (
                <button
                  key={p.email}
                  type="button"
                  onClick={() => applyPreset(p.email)}
                  className="flex items-center gap-2 rounded-xl border border-line bg-surface-2 px-3 py-2 text-left text-xs font-medium text-fg transition-colors hover:border-accent/40"
                >
                  <Icon className={`h-3.5 w-3.5 shrink-0 ${p.tone}`} />
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}