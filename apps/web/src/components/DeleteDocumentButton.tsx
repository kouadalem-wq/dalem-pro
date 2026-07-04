// src/components/DeleteDocumentButton.tsx
// Bouton de suppression pour devis/factures - visible seulement pour OWNER/ADMIN.
// Ouvre une modale de confirmation maison (pas le confirm() du navigateur).
// Les regles metier (devis converti, facture payee) sont appliquees cote
// serveur : les erreurs remontent en clair dans la modale.
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../lib/errors';

export function DeleteDocumentButton({
  kind,
  id,
  number,
}: {
  kind: 'quotes' | 'invoices';
  id: string;
  number: string;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remove = useMutation({
    mutationFn: async () => (await api.delete(`/${kind}/${id}`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [kind] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      setIsOpen(false);
    },
    onError: (err) => {
      setError(getErrorMessage(err));
    },
  });

  if (user?.role !== 'OWNER' && user?.role !== 'ADMIN') return null;

  const isQuote = kind === 'quotes';
  const label = isQuote ? 'ce devis' : 'cette facture';
  const noun = isQuote ? 'Devis' : 'Facture';

  function openModal() {
    setError(null);
    setIsOpen(true);
  }

  return (
    <>
      <button
        onClick={openModal}
        className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:border-coral-400 hover:bg-coral-500 hover:text-white"
        title={`Supprimer ${label}`}
        aria-label={`Supprimer ${label}`}
      >
        <span aria-hidden>🗑</span> Supprimer
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
          onClick={() => !remove.isPending && setIsOpen(false)}
        >
          <div
            className="animate-fade-slide-up w-full max-w-sm overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 pt-5">
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-coral-100 text-xl">
                🗑
              </div>
              <h3 className="font-display text-base font-semibold text-ink-950">
                Supprimer {label} ?
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {noun} <span className="font-medium text-gray-700">{number}</span> sera
                définitivement supprimé{isQuote ? '' : 'e'}. Cette action est irréversible.
              </p>

              {error && (
                <div className="mt-3 rounded-xl border border-coral-200 bg-coral-50 px-3 py-2 text-xs text-coral-600">
                  {error}
                </div>
              )}
            </div>

            <div className="mt-5 flex gap-3 border-t border-gray-100 px-5 py-4">
              <button
                onClick={() => setIsOpen(false)}
                disabled={remove.isPending}
                className="flex-1 rounded-xl border border-gray-300 bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-200 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  setError(null);
                  remove.mutate();
                }}
                disabled={remove.isPending}
                className="flex-1 rounded-xl bg-coral-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-coral-200 transition hover:bg-coral-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {remove.isPending ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
