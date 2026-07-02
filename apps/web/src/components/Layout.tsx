// src/components/Layout.tsx
// Enveloppe commune à toutes les pages internes : sidebar, halos décoratifs,
// bouton d'ouverture du menu. Évite de dupliquer ce code sur chaque page.

import { useState } from 'react';
import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';

type LayoutProps = {
  title: string;
  subtitle: string;
  action?: ReactNode;
  children: ReactNode;
};

export function Layout({ title, subtitle, action, children }: LayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#eef1ee]">
      <div
        className="pointer-events-none absolute -right-32 -top-48 h-[40rem] w-[40rem] rounded-full opacity-[0.35] blur-3xl"
        style={{ background: 'radial-gradient(circle, #0d9165 0%, transparent 65%)' }}
      />
      <div
        className="pointer-events-none absolute -left-40 top-1/4 h-[28rem] w-[28rem] rounded-full opacity-[0.2] blur-3xl"
        style={{ background: 'radial-gradient(circle, #0a0f0d 0%, transparent 65%)' }}
      />
      <div
        className="pointer-events-none absolute bottom-0 right-1/4 h-80 w-80 rounded-full opacity-[0.15] blur-3xl"
        style={{ background: 'radial-gradient(circle, #f2634a 0%, transparent 70%)' }}
      />

      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className="relative z-10 px-8 py-8">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="rounded-lg border border-gray-200 bg-white p-2 text-ink-950 shadow-sm transition-colors hover:bg-gray-50"
                aria-label="Ouvrir le menu"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
                </svg>
              </button>
              <h1 className="font-display text-2xl font-semibold text-ink-950">{title}</h1>
            </div>
            <p className="mt-1 pl-11 text-sm text-gray-500">{subtitle}</p>
            <div className="ml-11 mt-3 h-0.5 w-10 rounded-full bg-emerald-500" />
          </div>
          {action && <div>{action}</div>}
        </div>

        {children}
      </main>
    </div>
  );
}
