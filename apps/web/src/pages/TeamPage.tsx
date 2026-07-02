// src/pages/TeamPage.tsx

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Layout } from '../components/Layout';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { getErrorMessage } from '../lib/errors';
import { useAuth } from '../context/AuthContext';

type Member = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'OWNER' | 'EMPLOYEE';
  isActive: boolean;
  lastLoginAt: string | null;
};

type PendingAction = { type: 'deactivate' | 'delete'; member: Member } | null;

const emptyForm = { email: '', firstName: '', lastName: '' };

export function TeamPage() {
  const { user } = useAuth();
  const isOwner = user?.role === 'OWNER';
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  const { data, isLoading } = useQuery<{ data: Member[] }>({
    queryKey: ['team'],
    queryFn: async () => (await api.get('/users')).data,
  });

  const inviteEmployee = useMutation({
    mutationFn: async () => (await api.post('/users/invite', form)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team'] });
      setForm(emptyForm);
      setShowForm(false);
    },
  });

  const deactivateMember = useMutation({
    mutationFn: async (id: string) => (await api.patch(`/users/${id}/deactivate`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team'] });
      setPendingAction(null);
    },
  });

  const reactivateMember = useMutation({
    mutationFn: async (id: string) => (await api.patch(`/users/${id}/reactivate`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team'] });
    },
  });

  const deleteMember = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/users/${id}`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team'] });
      setPendingAction(null);
    },
  });

  function handleConfirm() {
    if (!pendingAction) return;
    if (pendingAction.type === 'deactivate') {
      deactivateMember.mutate(pendingAction.member.id);
    } else {
      deleteMember.mutate(pendingAction.member.id);
    }
  }

  const members = data?.data ?? [];
  const isActionLoading = deactivateMember.isPending || deleteMember.isPending;

  return (
    <Layout
      title="Équipe"
      subtitle={`${members.length} membre${members.length > 1 ? 's' : ''}`}
      action={
        isOwner ? (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="rounded-lg bg-ink-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-600"
          >
            {showForm ? 'Annuler' : '+ Inviter un employé'}
          </button>
        ) : undefined
      }
    >
      {showForm && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            inviteEmployee.mutate();
          }}
          className="mb-6 grid grid-cols-1 gap-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-md shadow-gray-200/60 sm:grid-cols-3"
        >
          {inviteEmployee.isError && (
            <div className="sm:col-span-3 rounded-lg bg-coral-500/10 px-3 py-2.5 text-sm text-coral-500">
              {getErrorMessage(inviteEmployee.error)}
            </div>
          )}
          {inviteEmployee.isSuccess && (
            <div className="sm:col-span-3 rounded-lg bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">
              Invitation envoyée avec succès.
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-gray-600">Prénom</label>
            <input
              required
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              className="mt-1.5 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Nom</label>
            <input
              required
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              className="mt-1.5 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="mt-1.5 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
          <div className="sm:col-span-3">
            <button
              type="submit"
              disabled={inviteEmployee.isPending}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
            >
              {inviteEmployee.isPending ? 'Envoi...' : "Envoyer l'invitation"}
            </button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-md shadow-gray-200/60">
        {isLoading ? (
          <p className="px-5 py-8 text-center text-sm text-gray-400">Chargement...</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
                <th className="px-5 py-3 font-medium">Nom</th>
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Rôle</th>
                <th className="px-5 py-3 font-medium">Statut</th>
                {isOwner && <th className="px-5 py-3 font-medium"></th>}
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id} className="border-t border-gray-50">
                  <td className="px-5 py-3.5 font-medium text-ink-950">
                    {member.firstName} {member.lastName}
                  </td>
                  <td className="px-5 py-3.5 text-gray-600">{member.email}</td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        member.role === 'OWNER' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {member.role === 'OWNER' ? 'Propriétaire' : 'Employé'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        member.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {member.isActive ? 'Actif' : 'Désactivé'}
                    </span>
                  </td>
                  {isOwner && (
                    <td className="px-5 py-3.5">
                      {member.role !== 'OWNER' && (
                        <div className="flex items-center gap-3">
                          {member.isActive ? (
                            <button
                              onClick={() => setPendingAction({ type: 'deactivate', member })}
                              className="text-xs text-gray-400 hover:text-coral-500"
                            >
                              Désactiver
                            </button>
                          ) : (
                            <button
                              onClick={() => reactivateMember.mutate(member.id)}
                              disabled={reactivateMember.isPending}
                              className="text-xs font-medium text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
                            >
                              Réactiver
                            </button>
                          )}
                          <button
                            onClick={() => setPendingAction({ type: 'delete', member })}
                            className="text-xs font-medium text-coral-500 hover:text-coral-600"
                          >
                            Supprimer
                          </button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pendingAction && (
        <ConfirmDialog
          title={
            pendingAction.type === 'delete'
              ? 'Supprimer définitivement ce compte ?'
              : 'Désactiver ce compte ?'
          }
          message={
            pendingAction.type === 'delete'
              ? `Le compte de ${pendingAction.member.firstName} ${pendingAction.member.lastName} sera supprimé définitivement. Cette action est irréversible et ne pourra pas être annulée.`
              : `${pendingAction.member.firstName} ${pendingAction.member.lastName} ne pourra plus se connecter, mais le compte pourra être réactivé plus tard.`
          }
          confirmLabel={pendingAction.type === 'delete' ? 'Supprimer définitivement' : 'Désactiver'}
          variant={pendingAction.type === 'delete' ? 'danger' : 'default'}
          isLoading={isActionLoading}
          onConfirm={handleConfirm}
          onCancel={() => setPendingAction(null)}
        />
      )}
    </Layout>
  );
}
