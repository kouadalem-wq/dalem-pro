// src/components/ReminderButton.tsx
// Bouton "✦ Relancer" pour une facture : demande à Dalem AI un message de
// relance personnalisé (ton adapté à l'historique du client), l'affiche dans
// une modale ÉDITABLE, puis l'utilisateur l'envoie sur WhatsApp ou le copie.
// L'IA propose, l'humain valide — comme partout dans Dalem_Pro.
import { useState } from 'react';
import { api } from '../lib/api';
import { buildWhatsAppLink } from '../lib/format';

type ReminderInvoice = {
  id: string;
  number: string;
  status: string;
  client: { name: string; phone?: string | null };
};

const RELANCABLE_STATUSES = ['SENT', 'PARTIAL', 'OVERDUE'];

function reminderErrorMessage(err: any): string {
  const msg = err?.response?.data?.message;
  if (Array.isArray(msg)) return msg.join(' ');
  if (typeof msg === 'string') return msg;
  if (err?.response?.status === 429)
    return "L'assistant est très sollicité. Réessaie dans une minute.";
  return "La génération du message a échoué. Réessaie.";
}

export function ReminderButton({ invoice }: { invoice: ReminderInvoice }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const canRemind = RELANCABLE_STATUSES.includes(invoice.status);

  async function openAndGenerate() {
    setIsOpen(true);
    setError(null);
    setMessage('');
    setCopied(false);
    setIsLoading(true);
    try {
      const res = await api.post(`/assistant/reminder/${invoice.id}`);
      setMessage(res.data?.data?.message ?? '');
    } catch (err: any) {
      setError(reminderErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }

  function handleWhatsApp() {
    if (!invoice.client.phone || !message.trim()) return;
    window.open(buildWhatsAppLink(invoice.client.phone, message.trim()), '_blank');
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(message.trim());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback silencieux : la sélection manuelle reste possible
    }
  }

  if (!canRemind) return null;

  return (
    <>
      <button
        onClick={openAndGenerate}
        className="flex items-center gap-1 rounded-lg border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white px-2.5 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100"
        title="Générer une relance personnalisée avec Dalem AI"
      >
        <span aria-hidden>✦</span> Relancer
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-[2px]"
          onClick={() => !isLoading && setIsOpen(false)}
        >
          <div
            className="animate-fade-slide-up w-full max-w-lg overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* En-tête */}
            <div className="flex items-center justify-between border-b border-emerald-100 bg-emerald-50/60 px-5 py-4">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-emerald-600">
                  Relance Dalem AI ✦
                </p>
                <p className="font-display text-sm font-semibold text-ink-950">
                  {invoice.number} · {invoice.client.name}
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                aria-label="Fermer"
              >
                ✕
              </button>
            </div>

            {/* Corps */}
            <div className="p-5">
              {isLoading ? (
                <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-400">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-400 [animation-delay:0ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-400 [animation-delay:150ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-400 [animation-delay:300ms]" />
                  <span className="ml-2">Rédaction de la relance...</span>
                </div>
              ) : error ? (
                <div className="rounded-xl border border-coral-200 bg-coral-50 px-4 py-3 text-sm text-coral-600">
                  {error}
                  <button
                    onClick={openAndGenerate}
                    className="ml-2 font-medium underline hover:no-underline"
                  >
                    Réessayer
                  </button>
                </div>
              ) : (
                <>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={7}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                  />
                  <p className="mt-2 text-[11px] text-gray-300">
                    Le ton est adapté à l'historique du client. Relis et ajuste avant d'envoyer.
                  </p>
                </>
              )}
            </div>

            {/* Actions */}
            {!isLoading && !error && (
              <div className="flex gap-2 border-t border-gray-100 px-5 py-4">
                <button
                  onClick={handleWhatsApp}
                  disabled={!invoice.client.phone || !message.trim()}
                  className="flex-1 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-emerald-200/60 transition hover:from-emerald-600 hover:to-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  title={
                    invoice.client.phone
                      ? 'Ouvrir WhatsApp avec ce message'
                      : "Le client n'a pas de téléphone enregistré"
                  }
                >
                  💬 Envoyer sur WhatsApp
                </button>
                <button
                  onClick={handleCopy}
                  disabled={!message.trim()}
                  className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
                >
                  {copied ? '✓ Copié' : 'Copier'}
                </button>
                <button
                  onClick={openAndGenerate}
                  className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-400 transition hover:bg-gray-50 hover:text-gray-600"
                  title="Régénérer un autre message"
                >
                  ↻
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
