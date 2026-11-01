import './globals.css';
import React from 'react';
import type { Metadata } from 'next';
import { Inter, Instrument_Serif } from 'next/font/google';
import { QueryProvider } from '@/providers/QueryProvider';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { ToastProvider } from '@/components/ui/Toast';
import { AppShell } from '@/components/AppShell';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const serif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'KPM - Tickets, Escalation & Performance',
  description: 'Real-time ticketing with SLA tracking, escalation handling and employee performance metrics.',
};

// Runs before the first paint so a saved light theme never flashes dark
const themeScript = `try{var t=localStorage.getItem('kpm-theme');document.documentElement.classList.toggle('dark',t!=='light');}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${inter.variable} ${serif.variable} font-sans`}>
        <ThemeProvider>
          <QueryProvider>
            <AuthProvider>
              <ToastProvider>
                <AppShell>{children}</AppShell>
              </ToastProvider>
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}