// src/components/Sidebar.tsx

import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { label: 'Tableau de bord', icon: '◈', to: '/dashboard' },
  { label: 'Dalem AI', icon: '✦', to: '/assistant' },
  { label: 'Devis', icon: '◇', to: '/quotes' },
  { label: 'Factures', icon: '▤', to: '/invoices' },
  { label: 'Clients', icon: '◎', to: '/clients' },
  { label: 'Produits', icon: '▣', to: '/products' },
  { label: 'Dépenses', icon: '◒', to: '/expenses' },
  { label: 'Équipe', icon: '◐', to: '/team' },
  { label: 'Paramètres', icon: '⚙', to: '/settings' },
];

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, tenant, logout } = useAuth();

  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase();

  return (
    <>
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-20 bg-black/20 backdrop-blur-[1px]"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-64 flex-col justify-between bg-ink-950 px-4 py-6 shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          <div className="mb-8 flex items-center justify-between px-2">
            <div className="font-display text-lg font-bold text-white">
              Dalem<span className="text-emerald-400">_</span>Pro
            </div>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Fermer le menu"
            >
              ✕
            </button>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                    isActive
                      ? 'bg-emerald-600/15 font-medium text-emerald-400'
                      : 'text-white/65 hover:bg-white/5 hover:text-white'
                  }`
                }
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="border-t border-white/10 pt-4">
          <div className="flex items-center gap-3 px-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-xs font-semibold text-white">
              {initials || '??'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="truncate text-xs text-white/55">{tenant?.name}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="mt-3 w-full rounded-lg px-3 py-2 text-left text-xs text-white/55 transition-colors hover:bg-white/5 hover:text-white"
          >
            Se déconnecter
          </button>
        </div>
      </aside>
    </>
  );
}
