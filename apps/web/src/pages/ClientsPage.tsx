// src/pages/ClientsPage.tsx

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Layout } from '../components/Layout';
import { getErrorMessage } from '../lib/errors';

type Client = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  createdAt: string;
};

const emptyForm = { name: '', email: '', phone: '' };

export function ClientsPage() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState(emptyForm);

  // Édition inline : editingId indique la ligne actuellement modifiée
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<{ data: Client[] }>({
    queryKey: ['clients'],
    queryFn: async () => (await api.get('/clients')).data,
  });

  const createClient = useMutation({
    mutationFn: async (payload: typeof createForm) => (await api.post('/clients', payload)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setCreateForm(emptyForm);
      setShowCreateForm(false);
    },
  });

  const updateClient = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: typeof editForm }) =>
      (await api.patch(`/clients/${id}`, payload)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setEditingId(null);
    },
  });

  function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    createClient.mutate(createForm);
  }

  function startEditing(client: Client) {
    setEditingId(client.id);
    setEditForm({ name: client.name, email: client.email ?? '', phone: client.phone ?? '' });
  }

  function handleEditSubmit(e: React.FormEvent, id: string) {
    e.preventDefault();
    updateClient.mutate({ id, payload: editForm });
  }

  const clients = data?.data ?? [];

  return (
    <Layout
      title="Clients"
      subtitle={`${clients.length} client${clients.length > 1 ? 's' : ''} enregistré${clients.length > 1 ? 's' : ''}`}
      action={
        <button
          onClick={() => setShowCreateForm((v) => !v)}
          className="rounded-lg bg-ink-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-600"
        >
          {showCreateForm ? 'Annuler' : '+ Nouveau client'}
        </button>
      }
    >
      {showCreateForm && (
        <form
          onSubmit={handleCreateSubmit}
          className="mb-6 grid grid-cols-1 gap-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-md shadow-gray-200/60 sm:grid-cols-3"
        >
          {createClient.isError && (
            <div className="sm:col-span-3 rounded-lg bg-coral-500/10 px-3 py-2.5 text-sm text-coral-500">
              {getErrorMessage(createClient.error)}
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-gray-600">Nom</label>
            <input
              required
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              className="mt-1.5 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              placeholder="Fatou Diop"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Email</label>
            <input
              type="email"
              value={createForm.email}
              onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
              className="mt-1.5 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              placeholder="fatou@example.com"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Téléphone</label>
            <input
              value={createForm.phone}
              onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
              className="mt-1.5 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              placeholder="+225 07 00 00 00"
            />
          </div>
          <div className="sm:col-span-3">
            <button
              type="submit"
              disabled={createClient.isPending}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
            >
              {createClient.isPending ? 'Ajout...' : 'Ajouter ce client'}
            </button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-md shadow-gray-200/60">
        {isLoading ? (
          <p className="px-5 py-8 text-center text-sm text-gray-400">Chargement...</p>
        ) : clients.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-400">Aucun client pour le moment.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
                <th className="px-5 py-3 font-medium">Nom</th>
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Téléphone</th>
                <th className="px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) =>
                editingId === client.id ? (
                  // ── Ligne en mode édition ────────────────────────────
                  <tr key={client.id} className="border-t border-gray-50 bg-emerald-50/30">
                    <td className="px-5 py-2.5" colSpan={4}>
                      <form
                        onSubmit={(e) => handleEditSubmit(e, client.id)}
                        className="flex flex-wrap items-center gap-2"
                      >
                        <input
                          required
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          className="w-40 rounded-md border border-gray-200 px-2.5 py-1.5 text-sm outline-none focus:border-emerald-500"
                          placeholder="Nom"
                        />
                        <input
                          type="email"
                          value={editForm.email}
                          onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                          className="w-52 rounded-md border border-gray-200 px-2.5 py-1.5 text-sm outline-none focus:border-emerald-500"
                          placeholder="Email"
                        />
                        <input
                          value={editForm.phone}
                          onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                          className="w-40 rounded-md border border-gray-200 px-2.5 py-1.5 text-sm outline-none focus:border-emerald-500"
                          placeholder="Téléphone"
                        />
                        <button
                          type="submit"
                          disabled={updateClient.isPending}
                          className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          {updateClient.isPending ? 'Enregistrement...' : 'Enregistrer'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                        >
                          Annuler
                        </button>
                      </form>
                      {updateClient.isError && (
                        <p className="mt-1.5 text-xs text-coral-500">{getErrorMessage(updateClient.error)}</p>
                      )}
                    </td>
                  </tr>
                ) : (
                  // ── Ligne normale ─────────────────────────────────────
                  <tr key={client.id} className="border-t border-gray-50">
                    <td className="px-5 py-3.5 font-medium text-ink-950">{client.name}</td>
                    <td className="px-5 py-3.5 text-gray-600">{client.email || '—'}</td>
                    <td className="px-5 py-3.5 text-gray-600">
                      {client.phone || <span className="text-coral-500">Manquant</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => startEditing(client)}
                        className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
                      >
                        Modifier
                      </button>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
}
