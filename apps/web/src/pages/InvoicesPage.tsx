// src/pages/InvoicesPage.tsx

import { Fragment, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Layout } from '../components/Layout';
import { ReminderButton } from '../components/ReminderButton';
import { DeleteDocumentButton } from '../components/DeleteDocumentButton';
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

type Invoice = {
  id: string;
  number: string;
  status: string;
  totalAmount: number;
  paidAmount: number;
  client: { name: string; email: string | null; phone: string | null };
};

export function InvoicesPage() {
  const { tenant } = useAuth();
  const currency = tenant?.currency ?? 'XOF';
  const queryClient = useQueryClient();

  const [payingInvoiceId, setPayingInvoiceId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery<{ data: Invoice[] }>({
    queryKey: ['invoices'],
    queryFn: async () => (await api.get('/invoices')).data,
  });

  const recordPayment = useMutation({
    mutationFn: async ({ invoiceId, amount, method }: { invoiceId: string; amount: number; method: string }) =>
      (await api.post(`/invoices/${invoiceId}/payments`, { amount: Math.round(amount * 100), method })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      setPayingInvoiceId(null);
      setPaymentAmount(0);
      setPaymentMethod('CASH');
    },
  });

  async function handleDownloadPdf(invoice: Invoice) {
    setDownloadingId(invoice.id);
    try {
      await downloadPdf(api, `/invoices/${invoice.id}/pdf`, `${invoice.number}.pdf`);
    } finally {
      setDownloadingId(null);
    }
  }

  const [emailFeedback, setEmailFeedback] = useState<{ invoiceId: string; message: string; isError: boolean } | null>(null);

  const sendByEmail = useMutation({
    mutationFn: async (invoiceId: string) => {
      const response = await api.post(`/invoices/${invoiceId}/send-email`);
      return { invoiceId, ...response.data };
    },
    onSuccess: (data) => {
      setEmailFeedback({ invoiceId: data.invoiceId, message: data.message ?? 'Envoyé.', isError: false });
      setTimeout(() => setEmailFeedback(null), 4000);
    },
    onError: (error, invoiceId) => {
      setEmailFeedback({ invoiceId, message: getErrorMessage(error), isError: true });
      setTimeout(() => setEmailFeedback(null), 5000);
    },
  });

  function handleSendWhatsApp(invoice: Invoice) {
    if (!invoice.client.phone) return;
    const message = buildInvoiceWhatsAppMessage({
      tenantName: tenant?.name ?? '',
      clientName: invoice.client.name,
      documentType: 'facture',
      number: invoice.number,
      amount: formatMoney(invoice.totalAmount, currency),
    });
    window.open(buildWhatsAppLink(invoice.client.phone, message), '_blank');
  }

  const invoices = data?.data ?? [];

  return (
    <Layout
      title="Factures"
      subtitle={`${invoices.length} facture${invoices.length > 1 ? 's' : ''} émise${invoices.length > 1 ? 's' : ''}`}
    >
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-md shadow-gray-200/60">
        {isLoading ? (
          <p className="px-5 py-8 text-center text-sm text-gray-400">Chargement...</p>
        ) : invoices.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-400">
            Aucune facture pour le moment. Convertissez un devis accepté pour en créer une.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
                <th className="px-5 py-3 font-medium">Numéro</th>
                <th className="px-5 py-3 font-medium">Client</th>
                <th className="px-5 py-3 font-medium">Total</th>
                <th className="px-5 py-3 font-medium">Payé</th>
                <th className="px-5 py-3 font-medium">Statut</th>
                <th className="px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => {
                const remaining = invoice.totalAmount - invoice.paidAmount;
                const isPayable = invoice.status !== 'PAID' && invoice.status !== 'CANCELLED';

                return (
                  <Fragment key={invoice.id}>
                  <tr className="border-t border-gray-50">
                    <td className="px-5 py-3.5 font-medium text-ink-950">{invoice.number}</td>
                    <td className="px-5 py-3.5 text-gray-600">{invoice.client.name}</td>
                    <td className="px-5 py-3.5 text-gray-900">{formatMoney(invoice.totalAmount, currency)}</td>
                    <td className="px-5 py-3.5 text-gray-600">{formatMoney(invoice.paidAmount, currency)}</td>
                    <td className="px-5 py-3.5">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[invoice.status]}`}>
                        {statusLabels[invoice.status]}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDownloadPdf(invoice)}
                          disabled={downloadingId === invoice.id}
                          className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
                          title="Télécharger en PDF"
                        >
                          <span aria-hidden>⬇</span> PDF
                        </button>

                        <ReminderButton invoice={invoice} />

                        <button
                          onClick={() => handleSendWhatsApp(invoice)}
                          disabled={!invoice.client.phone}
                          className="flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"
                          title={invoice.client.phone ? 'Envoyer par WhatsApp' : "Le client n'a pas de téléphone enregistré"}
                        >
                          <span aria-hidden>💬</span> WhatsApp
                        </button>

                        <button
                          onClick={() => sendByEmail.mutate(invoice.id)}
                          disabled={!invoice.client.email || (sendByEmail.isPending && sendByEmail.variables === invoice.id)}
                          className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                          title={invoice.client.email ? 'Envoyer par email' : "Le client n'a pas d'email enregistré"}
                        >
                          <span aria-hidden>✉</span>{' '}
                          {sendByEmail.isPending && sendByEmail.variables === invoice.id ? 'Envoi...' : 'Email'}
                        </button>

                        {isPayable && (
                          payingInvoiceId === invoice.id ? (
                            <div className="flex items-center gap-1.5">
                              <select
                                value={paymentMethod}
                                onChange={(e) => setPaymentMethod(e.target.value)}
                                className="rounded-md border border-gray-200 px-2 py-1 text-xs outline-none focus:border-emerald-500"
                              >
                                <option value="CASH">Espèces</option>
                                <option value="MOBILE_MONEY">Mobile Money</option>
                                <option value="BANK_TRANSFER">Virement</option>
                                <option value="CHEQUE">Chèque</option>
                                <option value="OTHER">Autre</option>
                              </select>
                              <input
                                type="number"
                                min={1}
                                max={remaining / 100}
                                step={0.01}
                                autoFocus
                                value={paymentAmount || ''}
                                onChange={(e) => setPaymentAmount(Number(e.target.value))}
                                placeholder={`Max ${formatMoney(remaining, currency)}`}
                                className="w-24 rounded-md border border-gray-200 px-2 py-1 text-xs outline-none focus:border-emerald-500"
                              />
                              <button
                                onClick={() =>
                                  recordPayment.mutate({
                                    invoiceId: invoice.id,
                                    amount: paymentAmount,
                                    method: paymentMethod,
                                  })
                                }
                                disabled={recordPayment.isPending || paymentAmount <= 0}
                                className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                              >
                                ✓
                              </button>
                              <button
                                onClick={() => setPayingInvoiceId(null)}
                                className="text-xs text-gray-400 hover:text-gray-600"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setPayingInvoiceId(invoice.id)}
                              className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
                            >
                              Encaisser
                            </button>
                          )
                        )}

                        <DeleteDocumentButton kind="invoices" id={invoice.id} number={invoice.number} />
                      </div>
                    </td>
                  </tr>
                  {emailFeedback?.invoiceId === invoice.id && (
                    <tr>
                      <td colSpan={6} className="px-5 pb-2">
                        <p className={`text-xs ${emailFeedback.isError ? 'text-coral-500' : 'text-emerald-600'}`}>
                          {emailFeedback.isError ? '✕ ' : '✓ '}
                          {emailFeedback.message}
                        </p>
                      </td>
                    </tr>
                  )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
}