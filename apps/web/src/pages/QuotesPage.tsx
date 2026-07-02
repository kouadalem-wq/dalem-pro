// src/pages/QuotesPage.tsx

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Layout } from '../components/Layout';
import {
  formatMoney,
  statusStyles,
  statusLabels,
  downloadPdf,
  buildWhatsAppLink,
  buildInvoiceWhatsAppMessage,
} from '../lib/format';
import { getErrorMessage } from '../lib/errors';
import { useAuth } from '../context/AuthContext';

type Quote = {
  id: string;
  number: string;
  status: string;
  totalAmount: number;
  convertedToInvoiceId: string | null;
  client: { name: string; phone: string | null };
};

type Client = { id: string; name: string };

type QuoteLine = { description: string; quantity: number; unitPrice: number };

// Prochaine action possible selon le statut actuel du devis
function getNextAction(status: string): { label: string; nextStatus: string } | null {
  switch (status) {
    case 'DRAFT':
      return { label: 'Envoyer', nextStatus: 'SENT' };
    case 'SENT':
      return { label: 'Marquer accepté', nextStatus: 'ACCEPTED' };
    default:
      return null;
  }
}

export function QuotesPage() {
  const { tenant } = useAuth();
  const currency = tenant?.currency ?? 'XOF';
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [clientMode, setClientMode] = useState<'existing' | 'new'>('new');
  const [clientId, setClientId] = useState('');
  const [newClientName, setNewClientName] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [taxRate, setTaxRate] = useState(0);
  const [lines, setLines] = useState<QuoteLine[]>([{ description: '', quantity: 1, unitPrice: 0 }]);

  const { data: quotesData, isLoading } = useQuery<{ data: Quote[] }>({
    queryKey: ['quotes'],
    queryFn: async () => (await api.get('/quotes')).data,
  });

  const { data: clientsData } = useQuery<{ data: Client[] }>({
    queryKey: ['clients'],
    queryFn: async () => (await api.get('/clients')).data,
  });

  const createQuote = useMutation({
    mutationFn: async () => {
      let finalClientId = clientId;
      if (clientMode === 'new') {
        const clientRes = await api.post('/clients', {
          name: newClientName,
          email: newClientEmail || undefined,
          phone: newClientPhone || undefined,
        });
        finalClientId = clientRes.data.data.id;
      }
      return (
        await api.post('/quotes', {
          clientId: finalClientId,
          taxRate,
          lines: lines.map((l) => ({ ...l, unitPrice: Math.round(l.unitPrice * 100) })),
        })
      ).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setClientId('');
      setNewClientName('');
      setNewClientEmail('');
      setNewClientPhone('');
      setClientMode('new');
      setTaxRate(0);
      setLines([{ description: '', quantity: 1, unitPrice: 0 }]);
      setShowForm(false);
    },
  });

  // Change le statut d'un devis (Envoyer, Marquer accepté, Marquer refusé)
  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) =>
      (await api.patch(`/quotes/${id}/status`, { status })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
    },
  });

  // Convertit un devis accepté en facture
  const convertToInvoice = useMutation({
    mutationFn: async (id: string) => (await api.post(`/quotes/${id}/convert-to-invoice`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });

  async function handleDownloadPdf(quote: Quote) {
    setDownloadingId(quote.id);
    try {
      await downloadPdf(api, `/quotes/${quote.id}/pdf`, `${quote.number}.pdf`);
    } finally {
      setDownloadingId(null);
    }
  }

  function handleSendWhatsApp(quote: Quote) {
    if (!quote.client.phone) return;
    const message = buildInvoiceWhatsAppMessage({
      tenantName: tenant?.name ?? '',
      clientName: quote.client.name,
      documentType: 'devis',
      number: quote.number,
      amount: formatMoney(quote.totalAmount, currency),
    });
    window.open(buildWhatsAppLink(quote.client.phone, message), '_blank');
  }

  function updateLine(index: number, field: keyof QuoteLine, value: string | number) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, [field]: value } : l)));
  }

  function addLine() {
    setLines((prev) => [...prev, { description: '', quantity: 1, unitPrice: 0 }]);
  }

  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  const quotes = quotesData?.data ?? [];
  const clients = clientsData?.data ?? [];

  const isClientValid = clientMode === 'existing' ? !!clientId : newClientName.trim().length > 0;
  const isLinesValid = lines.every((l) => l.description.trim() && l.quantity > 0 && l.unitPrice >= 0);
  const canSubmit = isClientValid && isLinesValid && !createQuote.isPending;

  return (
    <Layout
      title="Devis"
      subtitle={`${quotes.length} devis créé${quotes.length > 1 ? 's' : ''}`}
      action={
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-lg bg-ink-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-600"
        >
          {showForm ? 'Annuler' : '+ Nouveau devis'}
        </button>
      }
    >
      {showForm && (
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-md shadow-gray-200/60">
          {createQuote.isError && (
            <div className="mb-4 rounded-lg bg-coral-500/10 px-3 py-2.5 text-sm text-coral-500">
              {getErrorMessage(createQuote.error)}
            </div>
          )}

          <div className="mb-4 flex gap-2">
            <button
              type="button"
              onClick={() => setClientMode('new')}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                clientMode === 'new' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Nouveau client
            </button>
            <button
              type="button"
              onClick={() => setClientMode('existing')}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                clientMode === 'existing' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Client existant
            </button>
          </div>

          {clientMode === 'new' ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="text-xs font-medium text-gray-600">Nom du client *</label>
                <input
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="Fatou Diop"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Email (facultatif)</label>
                <input
                  type="email"
                  value={newClientEmail}
                  onChange={(e) => setNewClientEmail(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="fatou@example.com"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Téléphone (facultatif)</label>
                <input
                  value={newClientPhone}
                  onChange={(e) => setNewClientPhone(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="+225 07 00 00 00"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="text-xs font-medium text-gray-600">Client</label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="">Sélectionner un client</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {clients.length === 0 && (
                <p className="mt-1 text-xs text-gray-400">
                  Aucun client existant — utilisez "Nouveau client" ci-dessus.
                </p>
              )}
            </div>
          )}

          <div className="mt-4">
            <label className="text-xs font-medium text-gray-600">Taux de taxe (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              value={taxRate}
              onChange={(e) => setTaxRate(Number(e.target.value))}
              className="mt-1.5 w-32 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div className="mt-4">
            <p className="mb-2 text-xs font-medium text-gray-600">Lignes du devis *</p>

            {/* En-têtes de colonnes — alignés avec la largeur exacte des champs en dessous */}
            <div className="mb-1 flex gap-2 px-0.5">
              <span className="flex-1 text-[11px] font-medium uppercase tracking-wide text-gray-400">
                Description
              </span>
              <span className="w-20 text-[11px] font-medium uppercase tracking-wide text-gray-400">
                Quantité
              </span>
              <span className="w-32 text-[11px] font-medium uppercase tracking-wide text-gray-400">
                Prix unitaire
              </span>
              {lines.length > 1 && <span className="w-6" />}
            </div>

            <div className="space-y-2">
              {lines.map((line, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    placeholder="Ex: Pain complet"
                    value={line.description}
                    onChange={(e) => updateLine(i, 'description', e.target.value)}
                    className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <input
                    type="number"
                    min={0.01}
                    step={0.01}
                    placeholder="1"
                    value={line.quantity}
                    onChange={(e) => updateLine(i, 'quantity', Number(e.target.value))}
                    className="w-20 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    placeholder="0"
                    value={line.unitPrice}
                    onChange={(e) => updateLine(i, 'unitPrice', Number(e.target.value))}
                    className="w-32 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  />
                  {lines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLine(i)}
                      className="w-6 rounded-lg text-gray-400 hover:text-coral-500"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addLine}
              className="mt-2 text-xs font-medium text-emerald-600 hover:text-emerald-700"
            >
              + Ajouter une ligne
            </button>
          </div>

          <button
            onClick={() => createQuote.mutate()}
            disabled={!canSubmit}
            className="mt-5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
          >
            {createQuote.isPending ? 'Création...' : 'Créer le devis'}
          </button>
          {!canSubmit && !createQuote.isPending && (
            <p className="mt-2 text-xs text-gray-400">
              {!isClientValid
                ? 'Indiquez un nom de client.'
                : 'Chaque ligne doit avoir une description, une quantité et un prix.'}
            </p>
          )}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-md shadow-gray-200/60">
        {isLoading ? (
          <p className="px-5 py-8 text-center text-sm text-gray-400">Chargement...</p>
        ) : quotes.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-400">Aucun devis pour le moment.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
                <th className="px-5 py-3 font-medium">Numéro</th>
                <th className="px-5 py-3 font-medium">Client</th>
                <th className="px-5 py-3 font-medium">Montant</th>
                <th className="px-5 py-3 font-medium">Statut</th>
                <th className="px-5 py-3 font-medium">Prochaine étape</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((quote) => {
                const nextAction = getNextAction(quote.status);
                return (
                  <tr key={quote.id} className="border-t border-gray-50">
                    <td className="px-5 py-3.5 font-medium text-ink-950">{quote.number}</td>
                    <td className="px-5 py-3.5 text-gray-600">{quote.client.name}</td>
                    <td className="px-5 py-3.5 text-gray-900">{formatMoney(quote.totalAmount, currency)}</td>
                    <td className="px-5 py-3.5">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[quote.status]}`}>
                        {statusLabels[quote.status]}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDownloadPdf(quote)}
                          disabled={downloadingId === quote.id}
                          className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
                          title="Télécharger en PDF"
                        >
                          <span aria-hidden>⬇</span> PDF
                        </button>
                        <button
                          onClick={() => handleSendWhatsApp(quote)}
                          disabled={!quote.client.phone}
                          className="flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"
                          title={quote.client.phone ? 'Envoyer par WhatsApp' : "Le client n'a pas de téléphone enregistré"}
                        >
                          <span aria-hidden>💬</span> WhatsApp
                        </button>
                        {nextAction && (
                          <button
                            onClick={() => updateStatus.mutate({ id: quote.id, status: nextAction.nextStatus })}
                            disabled={updateStatus.isPending}
                            className="flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50"
                          >
                            {nextAction.label} <span aria-hidden>→</span>
                          </button>
                        )}
                        {quote.status === 'SENT' && (
                          <button
                            onClick={() => updateStatus.mutate({ id: quote.id, status: 'REJECTED' })}
                            disabled={updateStatus.isPending}
                            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-coral-500 disabled:opacity-50"
                          >
                            Refuser
                          </button>
                        )}
                        {quote.status === 'ACCEPTED' && !quote.convertedToInvoiceId && (
                          <button
                            onClick={() => convertToInvoice.mutate(quote.id)}
                            disabled={convertToInvoice.isPending}
                            className="flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50"
                          >
                            Convertir en facture <span aria-hidden>→</span>
                          </button>
                        )}
                        {quote.status === 'ACCEPTED' && quote.convertedToInvoiceId && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-400">
                            <span aria-hidden>✓</span> Déjà facturé
                          </span>
                        )}
                        {(quote.status === 'REJECTED' || quote.status === 'EXPIRED' || quote.status === 'CANCELLED') && (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
}
