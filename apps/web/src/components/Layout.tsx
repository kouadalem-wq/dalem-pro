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
    // IMPORTANT : plus de `overflow-hidden` ici.
    // Il coupait tout ce qui dépasse du conteneur — y compris les menus
    // déroulants (bouton « … » des factures) et la sidebar.
    <div className="relative min-h-screen bg-[#eef1ee]">

      {/* Calque décoratif isolé : c'est LUI qui porte l'overflow-hidden.
          Les halos restent confinés (pas de barre de défilement parasite),
          mais le contenu de l'app n'est plus rogné. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">

        {/* Halo vert principal — renforcé, confiné dans le coin haut-droit
            (hors de la zone titre/sous-titre à gauche) */}
        <div
          className="absolute -right-32 -top-52 h-[44rem] w-[44rem] rounded-full opacity-[0.6] blur-3xl"
          style={{ background: 'radial-gradient(circle, #0d9165 0%, transparent 70%)' }}
        />

        {/* Halo encre — gauche, renforcé mais discret */}
        <div
          className="absolute -left-44 top-1/3 h-[32rem] w-[32rem] rounded-full opacity-[0.32] blur-3xl"
          style={{ background: 'radial-gradient(circle, #0a0f0d 0%, transparent 68%)' }}
        />

        {/* Halo corail — bas-droit, renforcé */}
        <div
          className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full opacity-[0.28] blur-3xl"
          style={{ background: 'radial-gradient(circle, #f2634a 0%, transparent 72%)' }}
        />

        {/* Voile blanc léger en haut à gauche : protège le contraste du titre
            et du sous-titre gris, sans effacer l'effet coloré */}
        <div
          className="absolute -left-20 -top-20 h-[30rem] w-[30rem] rounded-full opacity-70 blur-3xl"
          style={{ background: 'radial-gradient(circle, #f7f8f7 0%, transparent 60%)' }}
        />
      </div>

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