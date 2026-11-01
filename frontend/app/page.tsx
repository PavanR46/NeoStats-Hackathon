'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, BarChart3, Moon, ShieldCheck, Sun, Ticket, Timer, TrendingUp } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';

const FEATURES = [
  { icon: Ticket, title: 'Ticket management', text: 'Create, assign and resolve tickets with a clear status flow and internal notes.' },
  { icon: Timer, title: 'SLA timers', text: 'Every priority has response and resolution deadlines that count down live.' },
  { icon: TrendingUp, title: 'Automatic escalation', text: 'Missed deadlines move tickets up a level, with a full history of why.' },
  { icon: BarChart3, title: 'Performance matrix', text: 'Fair, transparent KPIs per employee, measured against team targets.' },
  { icon: ShieldCheck, title: 'Role-based access', text: 'Permissions are enforced on the server, so people see only what they should.' },
];

// A small static sample of the real matrix, to show what the product does
const SAMPLE = [
  { name: 'Alex', sla: ['100%', 'ok'], frt: ['41 min', 'ok'], res: ['12.5 h', 'ok'], esc: ['0%', 'ok'], score: '100', band: 'Good' },
  { name: 'Priya', sla: ['25%', 'bad'], frt: ['2h 29m', 'mid'], res: ['21.3 h', 'ok'], esc: ['50%', 'bad'], score: '50.5', band: 'At risk' },
  { name: 'Ravi', sla: ['25%', 'bad'], frt: ['3h 2m', 'mid'], res: ['24.5 h', 'mid'], esc: ['75%', 'bad'], score: '44.7', band: 'At risk' },
];

const CELL: Record<string, string> = {
  ok: 'bg-success/10 text-success',
  mid: 'bg-warning/10 text-warning',
  bad: 'bg-danger/10 text-danger',
};

export default function LandingPage() {
  const { user } = useAuth();
  const { theme, toggle } = useTheme();
  const cta = user ? { href: '/dashboard', label: 'Open workspace' } : { href: '/login', label: 'Sign in' };

  return (
    <div className="min-h-screen">
      {/* Floating navigation */}
      <header className="fixed inset-x-0 top-4 z-50 px-4">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between rounded-2xl border border-line bg-surface/70 px-3 backdrop-blur-xl">
          <Link href="/" className="flex items-center gap-2.5 pl-1">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-fg text-sm font-bold text-canvas">K</span>
            <span className="font-semibold tracking-tight text-fg">KPM</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Sections">
            <a href="#features" className="rounded-full px-3 py-1.5 text-sm text-fg-muted hover:text-fg">Features</a>
            <a href="#preview" className="rounded-full px-3 py-1.5 text-sm text-fg-muted hover:text-fg">Preview</a>
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={toggle}
              role="switch"
              aria-checked={theme === 'dark'}
              aria-label="Dark mode"
              className="relative h-7 w-12 rounded-full border border-line bg-surface-2"
            >
              <span
                className={`absolute left-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-fg text-canvas transition-transform ${
                  theme === 'dark' ? 'translate-x-0' : 'translate-x-5'
                }`}
              >
                {theme === 'dark' ? <Moon className="h-3 w-3" /> : <Sun className="h-3 w-3" />}
              </span>
            </button>
            <Link href={cta.href} className="btn-primary">{cta.label}</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-4 pb-16 pt-40 text-center">
        <span className="pill">Tickets · SLA · Escalation · Performance</span>
        <h1 className="mt-8 text-5xl font-semibold leading-[1.05] tracking-tight text-fg md:text-7xl">
          Tickets <em className="accent-serif">resolved</em>
          <br />
          Performance <em className="accent-serif">measured</em>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-fg-muted">
          Real-time ticketing with SLA tracking, automatic escalation and fair, transparent employee metrics.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link href={cta.href} className="btn-primary px-6 py-3">
            {cta.label}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <a href="#preview" className="btn-ghost px-6 py-3">See the matrix</a>
        </div>
      </section>

      {/* Product preview */}
      <section id="preview" className="mx-auto max-w-5xl px-4 pb-24">
        <div className="rounded-3xl border border-accent/40 bg-surface/80 p-2 shadow-glow">
          <div className="overflow-hidden rounded-2xl border border-line bg-canvas">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <span className="text-sm font-medium text-fg">Performance matrix</span>
              <span className="pill">Last 30 days</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wider text-fg-subtle">
                    <th className="px-4 py-3 font-medium">Employee</th>
                    <th className="px-4 py-3 font-medium">SLA</th>
                    <th className="px-4 py-3 font-medium">First response</th>
                    <th className="px-4 py-3 font-medium">Resolution</th>
                    <th className="px-4 py-3 font-medium">Escalations</th>
                    <th className="px-4 py-3 font-medium">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {SAMPLE.map((r) => (
                    <tr key={r.name}>
                      <td className="px-4 py-3 font-medium text-fg">{r.name}</td>
                      {[r.sla, r.frt, r.res, r.esc].map((c, i) => (
                        <td key={i} className={`px-4 py-3 font-semibold ${CELL[c[1]]}`}>{c[0]}</td>
                      ))}
                      <td className="px-4 py-3 text-fg">
                        <span className="font-bold">{r.score}</span>{' '}
                        <span className="text-xs text-fg-subtle">{r.band}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-4 pb-24">
        <h2 className="mb-10 text-center text-3xl font-semibold tracking-tight text-fg md:text-4xl">
          Everything a support team <em className="accent-serif">needs</em>
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="card-hover glow-line group relative overflow-hidden p-6 text-center">
                <div className="dot-grid pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <div className="relative">
                  <Icon className="mx-auto h-7 w-7 text-fg" />
                  <h3 className="mt-4 text-sm font-semibold text-fg">{f.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-fg-muted">{f.text}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <footer className="border-t border-line py-8 text-center text-xs text-fg-subtle">
        KPM · Key Performance Metrics
      </footer>
    </div>
  );
}