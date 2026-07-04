// src/components/ActionsMenu.tsx
// Menu deroulant "..." reutilisable pour regrouper des actions secondaires.
// Se ferme au clic exterieur, a la touche Echap, ou apres selection d'une action.
import { useEffect, useRef, useState, type ReactNode } from 'react';

export type MenuAction = {
  label: string;
  icon?: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean; // affiche l'action en rouge (ex: supprimer)
  title?: string;
  // Permet d'injecter un element custom au lieu d'un simple bouton
  // (utile pour un composant qui gere lui-meme sa modale).
  render?: (close: () => void) => ReactNode;
};

export function ActionsMenu({ actions }: { actions: MenuAction[] }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onEscape);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex h-8 w-8 items-center justify-center rounded-lg border text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700 ${
          open ? 'border-gray-300 bg-gray-50' : 'border-gray-200'
        }`}
        title="Plus d'actions"
        aria-label="Plus d'actions"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <span aria-hidden className="text-base leading-none">⋯</span>
      </button>

      {open && (
        <div className="animate-fade-slide-up absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg shadow-gray-200/60">
          {actions.map((action, i) =>
            action.render ? (
              <div key={i}>{action.render(close)}</div>
            ) : (
              <button
                key={i}
                onClick={() => {
                  if (action.disabled) return;
                  action.onClick();
                  close();
                }}
                disabled={action.disabled}
                title={action.title}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                  action.danger
                    ? 'text-coral-600 hover:bg-coral-50'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {action.icon && <span aria-hidden>{action.icon}</span>}
                {action.label}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}
