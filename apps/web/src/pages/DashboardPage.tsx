// src/pages/DashboardPage.tsx
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { Lifeline } from '../components/Lifeline';
import { formatMoney, statusStyles, statusLabels } from '../lib/format';

type DashboardSummary = {
  revenue: { totalPaid: number; totalDue: number };
  expenses: { total: number };
  netProfit: number;
  overdueInvoicesCount: number;
  clientsCount: number;
  productsCount: number;
  recentInvoices: Array<{
    id: string;
    number: string;
    status: string;
    totalAmount: number;
    client: { name: string };
  }>;
};

function StatCard({
  label,
  value,
  accent,
  delay = 0,
}: {
  label: string;
  value: string;
  accent?: 'emerald' | 'coral' | 'ink';
  delay?: number;
}) {
  const accentClass = {
    emerald: 'text-emerald-600',
    coral: 'text-coral-500',
    ink: 'text-ink-950',
  }[accent ?? 'ink'];

  const borderClass = {
    emerald: 'border-l-emerald-500',
    coral: 'border-l-coral-500',
    ink: 'border-l-gray-200',
  }[accent ?? 'ink'];

  return (
    <div
      className={`animate-fade-slide-up rounded-2xl border border-gray-200 border-l-4 ${borderClass} bg-white p-5 shadow-md shadow-gray-200/60`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</p>
      <p className={`mt-2 font-display text-2xl font-semibold ${accentClass}`}>{value}</p>
    </div>
  );
}

export function DashboardPage() {
  const { user, tenant } = useAuth();

  const { data, isLoading } = useQuery<{ data: DashboardSummary }>({
    queryKey: ['dashboard-summary'],
    queryFn: async () => (await api.get('/dashboard/summary')).data,
  });

  const currency = tenant?.currency ?? 'XOF';
  const summary = data?.data;

  return (
    <Layout
      title={`Bonjour, ${user?.firstName} 👋`}
      subtitle={`Voici un aperçu de ${tenant?.name} aujourd'hui.`}
    >
      {/* LA LIGNE DE VIE — l'information la plus importante, tout en haut.
          Elle se charge indépendamment du reste du tableau de bord. */}
      <Lifeline />

      {isLoading ? (
        <p className="text-sm text-gray-400">Chargement...</p>
      ) : summary ? (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Revenu encaissé"
              value={formatMoney(summary.revenue.totalPaid, currency)}
              accent="emerald"
              delay={0}
            />
            <StatCard
              label="Montant dû"
              value={formatMoney(summary.revenue.totalDue, currency)}
              accent="coral"
              delay={150}
            />
            <StatCard
              label="Profit net"
              value={formatMoney(summary.netProfit, currency)}
              delay={300}
            />
            <StatCard
              label="Factures en retard"
              value={String(summary.overdueInvoicesCount)}
              accent={summary.overdueInvoicesCount > 0 ? 'coral' : 'ink'}
              delay={450}
            />
          </div>

          <div className="mb-6 grid grid-cols-2 gap-4">
            <StatCard label="Clients actifs" value={String(summary.clientsCount)} delay={600} />
            <StatCard
              label="Produits au catalogue"
              value={String(summary.productsCount)}
              delay={750}
            />
          </div>

          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-md shadow-gray-200/60">
            <div className="border-b border-gray-100 px-5 py-4">
              <h2 className="font-display text-sm font-semibold text-ink-950">Factures récentes</h2>
            </div>

            {summary.recentInvoices.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-gray-400">
                Aucune facture pour le moment.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
                    <th className="px-5 py-2.5 font-medium">Numéro</th>
                    <th className="px-5 py-2.5 font-medium">Client</th>
                    <th className="px-5 py-2.5 font-medium">Montant</th>
                    <th className="px-5 py-2.5 font-medium">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.recentInvoices.map((invoice) => (
                    <tr key={invoice.id} className="border-t border-gray-50">
                      <td className="px-5 py-3.5 font-medium text-ink-950">{invoice.number}</td>
                      <td className="px-5 py-3.5 text-gray-600">{invoice.client.name}</td>
                      <td className="px-5 py-3.5 text-gray-900">
                        {formatMoney(invoice.totalAmount, currency)}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            statusStyles[invoice.status] ?? statusStyles.DRAFT
                          }`}
                        >
                          {statusLabels[invoice.status] ?? invoice.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      ) : (
        <p className="text-sm text-gray-400">Impossible de charger le tableau de bord.</p>
      )}
    </Layout>
  );
}