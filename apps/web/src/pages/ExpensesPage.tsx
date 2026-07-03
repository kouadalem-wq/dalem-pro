// src/pages/ExpensesPage.tsx

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Layout } from '../components/Layout';
import { ScanReceiptButton } from '../components/ScanReceiptButton';
import { formatMoney, formatDate } from '../lib/format';
import { getErrorMessage } from '../lib/errors';
import { useAuth } from '../context/AuthContext';

type Expense = {
  id: string;
  category: string;
  description: string;
  amount: number; // en centimes
  date: string;
};

const categoryLabels: Record<string, string> = {
  SUPPLIES: 'Fournitures',
  RENT: 'Loyer',
  SALARY: 'Salaires',
  TRANSPORT: 'Transport',
  MARKETING: 'Marketing',
  UTILITIES: 'Eau / Électricité / Internet',
  TAXES: 'Impôts et taxes',
  OTHER: 'Autre',
};

const emptyForm = {
  category: 'OTHER',
  description: '',
  amount: 0, // saisi en unité principale, converti en centimes à l'envoi
};

export function ExpensesPage() {
  const { tenant } = useAuth();
  const currency = tenant?.currency ?? 'XOF';
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const { data, isLoading } = useQuery<{ data: Expense[] }>({
    queryKey: ['expenses'],
    queryFn: async () => (await api.get('/expenses')).data,
  });

  const createExpense = useMutation({
    mutationFn: async () =>
      (
        await api.post('/expenses', {
          ...form,
          amount: Math.round(form.amount * 100),
        })
      ).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      setForm(emptyForm);
      setShowForm(false);
    },
  });

  const deleteExpense = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/expenses/${id}`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });

  const expenses = data?.data ?? [];
  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <Layout
      title="Dépenses"
      subtitle={`${expenses.length} dépense${expenses.length > 1 ? 's' : ''} — ${formatMoney(total, currency)} au total`}
      action={
        <div className="flex items-center gap-2">
          <ScanReceiptButton />
          <button
            onClick={() => setShowForm((v) => !v)}
            className="rounded-lg bg-ink-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-600"
          >
            {showForm ? 'Annuler' : '+ Nouvelle dépense'}
          </button>
        </div>
      }
    >
      {showForm && (
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-md shadow-gray-200/60">
          {createExpense.isError && (
            <div className="mb-4 rounded-lg bg-coral-500/10 px-3 py-2.5 text-sm text-coral-500">
              {getErrorMessage(createExpense.error)}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-gray-600">Description *</label>
              <input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="mt-1.5 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                placeholder="Achat de farine"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Catégorie</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="mt-1.5 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              >
                {Object.entries(categoryLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-3">
            <label className="text-xs font-medium text-gray-600">Montant ({currency}) *</label>
            <input
              type="number"
              min={0}
              step={0.01}
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
              className="mt-1.5 w-40 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <button
            onClick={() => createExpense.mutate()}
            disabled={createExpense.isPending || !form.description || form.amount <= 0}
            className="mt-5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
          >
            {createExpense.isPending ? 'Ajout...' : 'Ajouter la dépense'}
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-md shadow-gray-200/60">
        {isLoading ? (
          <p className="px-5 py-8 text-center text-sm text-gray-400">Chargement...</p>
        ) : expenses.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-400">Aucune dépense pour le moment.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
                <th className="px-5 py-3 font-medium">Description</th>
                <th className="px-5 py-3 font-medium">Catégorie</th>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Montant</th>
                <th className="px-5 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense) => (
                <tr key={expense.id} className="border-t border-gray-50">
                  <td className="px-5 py-3.5 font-medium text-ink-950">{expense.description}</td>
                  <td className="px-5 py-3.5 text-gray-600">
                    {categoryLabels[expense.category] ?? expense.category}
                  </td>
                  <td className="px-5 py-3.5 text-gray-500">{formatDate(expense.date)}</td>
                  <td className="px-5 py-3.5 text-coral-500 font-medium">
                    -{formatMoney(expense.amount, currency)}
                  </td>
                  <td className="px-5 py-3.5">
                    <button
                      onClick={() => {
                        if (confirm('Supprimer cette dépense ?')) deleteExpense.mutate(expense.id);
                      }}
                      className="text-xs text-gray-400 hover:text-coral-500"
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
}