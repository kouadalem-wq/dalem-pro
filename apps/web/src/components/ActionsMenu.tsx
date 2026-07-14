// src/components/ActionsMenu.tsx
// Menu deroulant "..." reutilisable pour regrouper des actions secondaires.
// Se ferme au clic exterieur, a la touche Echap, ou apres selection d'une action.
//
// IMPORTANT : le menu est rendu via un PORTAIL (createPortal vers document.body).
// Sans cela, il reste prisonnier des conteneurs parents ayant `overflow-hidden`
// (ex. la carte blanche du tableau des factures), qui le coupent visuellement.
// Avec le portail, sa position est calculee a partir du bouton, et plus aucun
// parent ne peut le rogner.

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

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
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const MENU_WIDTH = 176; // = w-44 (11rem)

  // Calcule la position du menu juste sous le bouton, aligne a droite.
  // useLayoutEffect : on positionne AVANT la peinture, pour eviter tout scintillement.
  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;

    function place() {
      const r = buttonRef.current!.getBoundingClientRect();
      let left = r.right - MENU_WIDTH;            // aligne le bord droit du menu sur le bouton
      left = Math.max(8, left);                    // ne sort pas a gauche de l'ecran
      left = Math.min(left, window.innerWidth - MENU_WIDTH - 8); // ni a droite
      setCoords({ top: r.bottom + 4, left });      // 4px sous le bouton
    }

    place();
    // On repositionne si la fenetre bouge ou defile
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true); // true = capture aussi les scrolls internes
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open]);

  // Fermeture : clic exterieur ou touche Echap
  useEffect(() => {
    if (!open) return;

    function onClickOutside(e: MouseEvent) {
      const t = e.target as Node;
      const dansBouton = buttonRef.current?.contains(t);
      const dansMenu = menuRef.current?.contains(t);
      if (!dansBouton && !dansMenu) setOpen(false);
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

  // Le contenu du menu, rendu dans <body> via le portail
  const menu = (
    <div
      ref={menuRef}
      style={{ position: 'fixed', top: coords.top, left: coords.left, width: MENU_WIDTH }}
      className="animate-fade-slide-up z-[1000] overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg shadow-gray-200/60"
    >
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
  );

  return (
    <div className="relative">
      <button
        ref={buttonRef}
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

      {/* Le menu vit dans <body> : aucun overflow-hidden parent ne peut le couper */}
      {open && createPortal(menu, document.body)}
    </div>
  );
}