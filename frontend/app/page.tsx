'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import {
  Shield,
  Zap,
  Lock,
  Activity,
  ArrowRight,
  CheckCircle2,
  Users,
  FolderKanban,
  Crown,
  Briefcase,
  Code,
  Eye,
  MessageSquare,
  Sparkles,
} from 'lucide-react';

export default function LandingPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-brand-500 selection:text-white">
      {/* Header Navbar */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-800 bg-clip-text text-transparent">
              NeoStats
            </span>
          </Link>

          <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-slate-600">
            <a href="#features" className="hover:text-slate-900 transition-colors">
              Features
            </a>
            <a href="#concurrency" className="hover:text-slate-900 transition-colors">
              409 Concurrency
            </a>
            <a href="#roles" className="hover:text-slate-900 transition-colors">
              Role Matrix
            </a>
            <a href="#architecture" className="hover:text-slate-900 transition-colors">
              Architecture
            </a>
          </nav>

          <div className="flex items-center space-x-3">
            {user ? (
              <Link
                href="/dashboard"
                className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold shadow-md shadow-brand-500/20 transition-all flex items-center space-x-2"
              >
                <span>Go to Dashboard</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <Link
                href="/login"
                className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold shadow-md shadow-brand-500/20 transition-all flex items-center space-x-2"
              >
                <span>Launch Workspace</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-16 pb-20 px-6 overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center space-y-6 relative z-10">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-xs font-semibold shadow-xs">
            <Sparkles className="h-3.5 w-3.5 text-brand-600" />
            <span>NeoStats Hackathon v1.0 • Real-Time Role-Governed PM Engine</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.15]">
            Collaborate in Real-Time with <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-brand-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Server-Enforced Governance
            </span>
          </h1>

          <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            The Next.js & Express platform with Optimistic Concurrency Locking, Socket.IO WebSockets, role-based authorization matrix, and live audit streams.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href={user ? '/dashboard' : '/login'}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white font-semibold shadow-lg shadow-brand-500/25 flex items-center justify-center space-x-2 transition-all"
            >
              <span>{user ? 'Enter Platform Dashboard' : 'Open Workspace Demo'}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#concurrency"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-medium shadow-xs transition-colors flex items-center justify-center space-x-2"
            >
              <Zap className="h-4 w-4 text-amber-500" />
              <span>See 409 Conflict Engine</span>
            </a>
          </div>

          {/* Hero UI Screenshot */}
          <div className="pt-10 max-w-5xl mx-auto">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-2xl p-2 sm:p-3 overflow-hidden">
              <Image
                src="/hero.jpg"
                alt="NeoStats Platform Dashboard Mockup"
                width={1200}
                height={675}
                className="rounded-xl w-full h-auto object-cover"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* Feature Section Grid */}
      <section id="features" className="py-20 px-6 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-xs font-bold text-brand-600 uppercase tracking-wider">Enterprise Architecture</h2>
            <p className="text-3xl font-bold text-slate-900 tracking-tight">
              Engineered for High-Concurrency Multi-User Teams
            </p>
            <p className="text-sm text-slate-500">
              Unlike simplistic CRUD apps, NeoStats enforces security rules and data integrity directly on the backend.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 hover:border-brand-300 hover:shadow-md transition-all">
              <div className="h-10 w-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                <Zap className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">409 Conflict Engine</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Uses database version locking (<code className="text-amber-700 bg-amber-50 px-1 py-0.5 rounded">Task.version</code>). Prevents silent overwrites during concurrent edits with side-by-side UI resolution.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 hover:border-brand-300 hover:shadow-md transition-all">
              <div className="h-10 w-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600">
                <Lock className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">2-Tier Role Matrix</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Enforces Global Roles (<code className="text-purple-700 bg-purple-50 px-1 py-0.5 rounded">ADMIN/USER</code>) and Project Roles (<code className="text-purple-700 bg-purple-50 px-1 py-0.5 rounded">PM/MEMBER/VIEWER</code>) strictly via Express middleware.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 hover:border-brand-300 hover:shadow-md transition-all">
              <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                <Activity className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Real-Time WebSockets</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Socket.IO handshake authenticated via HTTP-Only JWT cookies. Streams live updates to task status, member roster, and notifications.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 hover:border-brand-300 hover:shadow-md transition-all">
              <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                <FolderKanban className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Immutable Audit Trail</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Every task creation, status update, member add/remove, or comment posts to a human-readable audit log timeline.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 409 Concurrency Showcase Section */}
      <section id="concurrency" className="py-20 px-6 bg-slate-50">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-4 md:w-1/2">
              <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold uppercase tracking-wider">
                Concurrency Safety
              </span>
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                Never Overwrite Team Edits Accidentally
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                When two team members edit a Kanban card at the same time, traditional tools silently overwrite the first update. NeoStats detects version mismatches on the server and pops up an intuitive side-by-side conflict dialog.
              </p>

              <ul className="space-y-2.5 text-xs font-medium text-slate-700">
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Integer version tracking per task record</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Returns HTTP 409 Conflict with server latestTask payload</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Choose to Discard or Re-apply edit onto version N+1</span>
                </li>
              </ul>
            </div>

            {/* Simulated 409 Conflict Card Mockup */}
            <div className="md:w-1/2 w-full bg-white p-6 rounded-2xl border border-amber-300 shadow-xl space-y-4">
              <div className="flex items-center space-x-3 border-b border-slate-100 pb-3">
                <div className="h-8 w-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
                  <Zap className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">409 Conflict Resolution Dialog</h4>
                  <p className="text-[11px] text-slate-500">Simulated live concurrency guard</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <p className="font-bold text-slate-500 text-[10px] uppercase">Your Stale Edit (v1)</p>
                  <p className="text-slate-800 font-semibold">Target: DONE</p>
                </div>
                <div className="p-3 rounded-xl bg-brand-50/60 border border-brand-200 space-y-1">
                  <p className="font-bold text-brand-700 text-[10px] uppercase">Server Record (v2)</p>
                  <p className="text-slate-800 font-semibold">Current: IN_PROGRESS</p>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <span className="px-3 py-1.5 rounded-lg bg-slate-100 text-[11px] text-slate-700 font-medium">
                  Discard
                </span>
                <span className="px-3 py-1.5 rounded-lg bg-brand-600 text-[11px] text-white font-medium shadow-xs">
                  Re-apply Edit (v2)
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Role Matrix Section */}
      <section id="roles" className="py-20 px-6 bg-white border-t border-slate-200">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-xs font-bold text-purple-600 uppercase tracking-wider">Granular Security Matrix</h2>
            <p className="text-3xl font-bold text-slate-900 tracking-tight">
              Role-Based Access Control Designed for Governance
            </p>
            <p className="text-sm text-slate-500">
              The Express backend enforces exact boundary conditions across all 4 project roles.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl bg-purple-50/50 border border-purple-200 space-y-4">
              <div className="flex items-center space-x-2">
                <Crown className="h-5 w-5 text-purple-600" />
                <h3 className="text-base font-bold text-purple-900">Admin User</h3>
              </div>
              <ul className="space-y-2 text-xs text-slate-700">
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                  <span>Global system override</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                  <span>User account creation & deactivation</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                  <span>Full project management</span>
                </li>
              </ul>
            </div>

            <div className="p-6 rounded-2xl bg-blue-50/50 border border-blue-200 space-y-4">
              <div className="flex items-center space-x-2">
                <Briefcase className="h-5 w-5 text-blue-600" />
                <h3 className="text-base font-bold text-blue-900">Project Manager</h3>
              </div>
              <ul className="space-y-2 text-xs text-slate-700">
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                  <span>Create & archive project</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                  <span>Add, remove & re-role team members</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                  <span>Assign any task to any member</span>
                </li>
              </ul>
            </div>

            <div className="p-6 rounded-2xl bg-emerald-50/50 border border-emerald-200 space-y-4">
              <div className="flex items-center space-x-2">
                <Code className="h-5 w-5 text-emerald-600" />
                <h3 className="text-base font-bold text-emerald-900">Team Member</h3>
              </div>
              <ul className="space-y-2 text-xs text-slate-700">
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>Update assigned & unassigned tasks</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>Post & delete own comments</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>Receive @mention notifications</span>
                </li>
              </ul>
            </div>

            <div className="p-6 rounded-2xl bg-slate-100/60 border border-slate-200 space-y-4">
              <div className="flex items-center space-x-2">
                <Eye className="h-5 w-5 text-slate-600" />
                <h3 className="text-base font-bold text-slate-900">Viewer User</h3>
              </div>
              <ul className="space-y-2 text-xs text-slate-700">
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-slate-600 shrink-0" />
                  <span>Read-only access to boards</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-slate-600 shrink-0" />
                  <span>View activity timeline</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-slate-600 shrink-0" />
                  <span>Write attempts return 403 Forbidden</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-6 bg-gradient-to-r from-brand-600 via-indigo-600 to-purple-600 text-white">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h2 className="text-3xl font-extrabold tracking-tight">Ready to Test NeoStats Real-Time Engine?</h2>
          <p className="text-sm text-brand-100 max-w-xl mx-auto">
            Use our built-in hackathon quick-login presets to test dual-window Socket.IO events and 409 concurrency locking.
          </p>
          <div className="pt-2">
            <Link
              href="/login"
              className="inline-flex items-center space-x-2 px-8 py-3.5 rounded-xl bg-white text-brand-700 font-bold shadow-xl hover:bg-slate-50 transition-all"
            >
              <span>Launch NeoStats Workspace</span>
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 bg-slate-900 text-slate-400 text-xs border-t border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <Shield className="h-4 w-4 text-brand-500" />
            <span className="font-semibold text-white">NeoStats Hackathon v1.0</span>
          </div>
          <p>© 2026 NeoStats PM Platform. Real-Time Collaborative Architecture.</p>
        </div>
      </footer>
    </div>
  );
}
