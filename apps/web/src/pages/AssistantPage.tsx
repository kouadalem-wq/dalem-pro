// src/pages/AssistantPage.tsx
// Dalem AI — assistant business conversationnel propulsé par Groq (Llama 3.3 70B).
// Deux modes :
//   - Chat : questions sur les données du business (dashboard summary côté backend)
//   - Devis : création de devis en langage naturel → brouillon structuré par l'IA,
//     TOUJOURS validé par l'utilisateur avant création (POST /quotes existant).
import { useState, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { formatMoney } from '../lib/format';

type DraftLine = {
  productId: string | null;
  description: string;
  quantity: number;
  unitPrice: number; // en centimes
};

type QuoteDraft = {
  client: { id: string | null; name: string };
  lines: DraftLine[];
  taxRate: number;
};

type ChatItem =
  | { type: 'text'; role: 'user' | 'assistant'; content: string }
  | {
      type: 'draft';
      draft: QuoteDraft;
      status: 'pending' | 'created' | 'cancelled';
      quoteNumber?: string;
    };

const CHAT_SUGGESTIONS = [
  'Fais-moi un résumé de la situation de mon entreprise',
  'Combien de factures en retard ai-je ?',
  'Quel montant total me doit-on actuellement ?',
  'Comment évoluent mes dépenses ?',
];

const QUOTE_EXAMPLE =
  "Devis pour Koné Électricité : 3 jours d'installation à 45 000 F/jour + 12 prises à 2 500 F";

function apiErrorMessage(err: any, fallback: string): string {
  const msg = err?.response?.data?.message;
  if (Array.isArray(msg)) return msg.join(' ');
  if (typeof msg === 'string') return msg;
  const status = err?.response?.status;
  if (status === 429) return "L'assistant est très sollicité en ce moment. Réessaie dans une minute.";
  if (status === 503) return "L'assistant IA est temporairement indisponible.";
  return fallback;
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-4 py-3">
      <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-400 [animation-delay:0ms]" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-400 [animation-delay:150ms]" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-400 [animation-delay:300ms]" />
    </div>
  );
}

function AiAvatar() {
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-sm text-white shadow-md shadow-emerald-200">
      ✦
    </div>
  );
}

function DraftCard({
  item,
  currency,
  isCreating,
  onConfirm,
  onCancel,
}: {
  item: Extract<ChatItem, { type: 'draft' }>;
  currency: string;
  isCreating: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { draft, status, quoteNumber } = item;
  const subtotal = draft.lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  const taxAmount = Math.round((subtotal * draft.taxRate) / 100);
  const total = subtotal + taxAmount;

  return (
    <div className="flex items-start gap-3">
      <AiAvatar />
      <div className="w-full max-w-[85%] overflow-hidden rounded-2xl rounded-bl-md border border-emerald-200 bg-white shadow-md shadow-emerald-100/60">
        <div className="flex items-center justify-between border-b border-emerald-100 bg-emerald-50/60 px-4 py-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-emerald-600">
              Brouillon de devis
            </p>
            <p className="font-display text-sm font-semibold text-ink-950">
              {draft.client.name}
              {draft.client.id === null && (
                <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                  nouveau client
                </span>
              )}
            </p>
          </div>
          {status === 'created' && (
            <span className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-medium text-white">
              ✓ Créé {quoteNumber ? `· ${quoteNumber}` : ''}
            </span>
          )}
          {status === 'cancelled' && (
            <span className="rounded-full bg-gray-200 px-3 py-1 text-xs font-medium text-gray-500">
              Annulé
            </span>
          )}
        </div>

        <div className="px-4 py-3">
          <table className="w-full text-sm">
            <tbody>
              {draft.lines.map((line, i) => (
                <tr key={i} className="border-b border-gray-100 last:border-0">
                  <td className="py-2 pr-2 text-gray-700">{line.description}</td>
                  <td className="whitespace-nowrap py-2 pr-2 text-right text-gray-400">
                    {line.quantity} × {formatMoney(line.unitPrice, currency)}
                  </td>
                  <td className="whitespace-nowrap py-2 text-right font-medium text-ink-950">
                    {formatMoney(line.unitPrice * line.quantity, currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-3 space-y-1 border-t border-gray-100 pt-3 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>Sous-total</span>
              <span>{formatMoney(subtotal, currency)}</span>
            </div>
            {draft.taxRate > 0 && (
              <div className="flex justify-between text-gray-500">
                <span>Taxe ({draft.taxRate}%)</span>
                <span>{formatMoney(taxAmount, currency)}</span>
              </div>
            )}
            <div className="flex justify-between font-display text-base font-semibold text-emerald-600">
              <span>Total</span>
              <span>{formatMoney(total, currency)}</span>
            </div>
          </div>
        </div>

        {status === 'pending' && (
          <div className="flex gap-2 border-t border-gray-100 px-4 py-3">
            <button
              onClick={onConfirm}
              disabled={isCreating}
              className="flex-1 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-emerald-200/60 transition hover:from-emerald-600 hover:to-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isCreating ? 'Création...' : 'Créer le devis'}
            </button>
            <button
              onClick={onCancel}
              disabled={isCreating}
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-500 transition hover:bg-gray-50 disabled:opacity-50"
            >
              Annuler
            </button>
          </div>
        )}
        {status === 'created' && (
          <div className="border-t border-gray-100 px-4 py-2.5 text-xs text-gray-400">
            Retrouve-le dans la page Devis (PDF, envoi, conversion en facture).
          </div>
        )}
      </div>
    </div>
  );
}

export function AssistantPage() {
  const { user, tenant } = useAuth();
  const queryClient = useQueryClient();
  const currency = tenant?.currency ?? 'XOF';

  const [mode, setMode] = useState<'chat' | 'quote'>('chat');
  const [items, setItems] = useState<ChatItem[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [creatingIndex, setCreatingIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [items, isLoading]);

  async function sendChat(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    setError(null);
    // L'historique pour l'IA = uniquement les messages texte
    const history = items
      .filter((it): it is Extract<ChatItem, { type: 'text' }> => it.type === 'text')
      .slice(-10)
      .map((it) => ({ role: it.role, content: it.content }));

    setItems((prev) => [...prev, { type: 'text', role: 'user', content: trimmed }]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await api.post('/assistant/chat', { message: trimmed, history });
      const reply: string = response.data?.data?.reply ?? 'Réponse vide.';
      setItems((prev) => [...prev, { type: 'text', role: 'assistant', content: reply }]);
    } catch (err: any) {
      setError(apiErrorMessage(err, "Impossible de contacter l'assistant. Réessaie."));
      setItems((prev) => prev.slice(0, -1));
      setInput(trimmed);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }

  async function sendDraftQuote(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    setError(null);
    setItems((prev) => [...prev, { type: 'text', role: 'user', content: trimmed }]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await api.post('/assistant/draft-quote', { text: trimmed });
      const draft: QuoteDraft = response.data?.data?.draft;
      setItems((prev) => [
        ...prev,
        {
          type: 'text',
          role: 'assistant',
          content: "Voici le brouillon que j'ai préparé. Vérifie les montants puis confirme :",
        },
        { type: 'draft', draft, status: 'pending' },
      ]);
    } catch (err: any) {
      setError(
        apiErrorMessage(
          err,
          "Je n'ai pas réussi à préparer ce devis. Précise le client, les quantités et les prix.",
        ),
      );
      setItems((prev) => prev.slice(0, -1));
      setInput(trimmed);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }

  async function confirmDraft(index: number) {
    const item = items[index];
    if (!item || item.type !== 'draft' || item.status !== 'pending') return;

    setCreatingIndex(index);
    setError(null);
    try {
      // Si le client n'existe pas encore, on le crée d'abord (même flux que QuotesPage)
      let clientId = item.draft.client.id;
      if (!clientId) {
        const clientRes = await api.post('/clients', { name: item.draft.client.name });
        clientId = clientRes.data.data.id;
      }

      const quoteRes = await api.post('/quotes', {
        clientId,
        taxRate: item.draft.taxRate,
        lines: item.draft.lines.map((l) => ({
          productId: l.productId ?? undefined,
          description: l.description,
          quantity: l.quantity,
          unitPrice: l.unitPrice, // déjà en centimes
        })),
      });
      const quoteNumber: string | undefined = quoteRes.data?.data?.number;

      setItems((prev) =>
        prev.map((it, i) =>
          i === index && it.type === 'draft' ? { ...it, status: 'created', quoteNumber } : it,
        ),
      );
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    } catch (err: any) {
      setError(apiErrorMessage(err, 'La création du devis a échoué. Réessaie.'));
    } finally {
      setCreatingIndex(null);
    }
  }

  function cancelDraft(index: number) {
    setItems((prev) =>
      prev.map((it, i) =>
        i === index && it.type === 'draft' && it.status === 'pending'
          ? { ...it, status: 'cancelled' }
          : it,
      ),
    );
  }

  function handleSend() {
    if (mode === 'quote') {
      sendDraftQuote(input);
    } else {
      sendChat(input);
    }
  }

  const isEmpty = items.length === 0 && !isLoading;

  return (
    <Layout
      title="Dalem AI ✦"
      subtitle="Ton assistant business intelligent. Pose une question ou dicte un devis."
    >
      <div className="animate-fade-slide-up flex h-[calc(100vh-180px)] flex-col rounded-2xl border border-gray-200 bg-white shadow-md shadow-gray-200/60">
        {/* Zone de conversation */}
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {isEmpty ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-2xl text-white shadow-lg shadow-emerald-200">
                ✦
              </div>
              <h2 className="font-display text-lg font-semibold text-ink-950">
                Bonjour{user?.firstName ? `, ${user.firstName}` : ''} 👋
              </h2>
              {mode === 'chat' ? (
                <>
                  <p className="mt-1 max-w-sm text-sm text-gray-400">
                    Je connais tes chiffres en temps réel : revenus, factures, dépenses, clients.
                    Que veux-tu savoir ?
                  </p>
                  <div className="mt-6 grid w-full max-w-lg grid-cols-1 gap-2 sm:grid-cols-2">
                    {CHAT_SUGGESTIONS.map((s, i) => (
                      <button
                        key={s}
                        onClick={() => sendChat(s)}
                        className="animate-fade-slide-up rounded-xl border border-gray-200 bg-white px-4 py-3 text-left text-sm text-gray-600 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
                        style={{ animationDelay: `${i * 80}ms` }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <p className="mt-1 max-w-md text-sm text-gray-400">
                    Décris ton devis en une phrase : client, prestations, quantités et prix.
                    Je prépare le brouillon, tu valides avant création.
                  </p>
                  <button
                    onClick={() => setInput(QUOTE_EXAMPLE)}
                    className="animate-fade-slide-up mt-6 max-w-lg rounded-xl border border-dashed border-emerald-300 bg-emerald-50/50 px-4 py-3 text-left text-sm text-emerald-700 transition hover:bg-emerald-50"
                  >
                    Exemple : « {QUOTE_EXAMPLE} »
                  </button>
                </>
              )}
            </div>
          ) : (
            <>
              {items.map((item, i) => {
                if (item.type === 'draft') {
                  return (
                    <DraftCard
                      key={i}
                      item={item}
                      currency={currency}
                      isCreating={creatingIndex === i}
                      onConfirm={() => confirmDraft(i)}
                      onCancel={() => cancelDraft(i)}
                    />
                  );
                }
                return item.role === 'user' ? (
                  <div key={i} className="flex justify-end">
                    <div className="max-w-[80%] rounded-2xl rounded-br-md bg-gradient-to-br from-emerald-500 to-emerald-600 px-4 py-3 text-sm text-white shadow-md shadow-emerald-200/60">
                      {item.content}
                    </div>
                  </div>
                ) : (
                  <div key={i} className="flex items-start gap-3">
                    <AiAvatar />
                    <div className="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-bl-md border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                      {item.content}
                    </div>
                  </div>
                );
              })}
              {isLoading && (
                <div className="flex items-start gap-3">
                  <AiAvatar />
                  <div className="rounded-2xl rounded-bl-md border border-gray-200 bg-gray-50">
                    <TypingIndicator />
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Message d'erreur */}
        {error && (
          <div className="mx-5 mb-2 rounded-xl border border-coral-200 bg-coral-50 px-4 py-2 text-sm text-coral-600">
            {error}
          </div>
        )}

        {/* Zone de saisie */}
        <div className="border-t border-gray-100 p-4">
          {/* Sélecteur de mode */}
          <div className="mb-3 flex gap-1 rounded-xl bg-gray-100 p-1">
            <button
              onClick={() => setMode('chat')}
              className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                mode === 'chat'
                  ? 'bg-white text-emerald-600 shadow-sm'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              💬 Questions
            </button>
            <button
              onClick={() => setMode('quote')}
              className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                mode === 'quote'
                  ? 'bg-white text-emerald-600 shadow-sm'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              ✦ Rédiger un devis
            </button>
          </div>

          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={
                mode === 'quote'
                  ? 'Décris ton devis : client, prestations, quantités, prix...'
                  : 'Pose une question sur ton activité...'
              }
              disabled={isLoading}
              className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-ink-950 outline-none transition placeholder:text-gray-400 focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100 disabled:opacity-60"
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 px-5 py-3 text-sm font-medium text-white shadow-md shadow-emerald-200/60 transition hover:from-emerald-600 hover:to-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {mode === 'quote' ? 'Préparer' : 'Envoyer'}
            </button>
          </div>
          <p className="mt-2 text-center text-[11px] text-gray-300">
            Dalem AI répond à partir des données de ton entreprise. Vérifie toujours les montants avant de créer un document.
          </p>
        </div>
      </div>
    </Layout>
  );
}
