// src/pages/AssistantPage.tsx
// Dalem AI — assistant business conversationnel propulsé par Groq (Llama 3.3 70B).
// Trois modes :
//   - Chat : questions sur les données du business
//   - Devis : création de devis en langage naturel → brouillon éditable → validation
//   - Modifier : CONVERSATION itérative autour d'un devis existant (lignes, prix,
//     quantités, remises, taxe et même changement de client) jusqu'à validation
//     → PATCH /quotes/:id.
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
  unitPrice: number; // en centimes, peut être négatif (remise) en mode modification
};

type QuoteDraft = {
  kind: 'create' | 'edit';
  client: { id: string | null; name: string }; // id null = nouveau client à créer
  lines: DraftLine[];
  taxRate: number;
  // Présents uniquement en mode 'edit' :
  quoteId?: string;
  number?: string;
  summary?: string;
};

type ChatItem =
  | { type: 'text'; role: 'user' | 'assistant'; content: string }
  | {
      type: 'draft';
      draft: QuoteDraft;
      status: 'pending' | 'created' | 'cancelled';
      quoteNumber?: string;
    };

type Mode = 'chat' | 'quote' | 'edit';

const CHAT_SUGGESTIONS = [
  'Fais-moi un résumé de la situation de mon entreprise',
  'Combien de factures en retard ai-je ?',
  'Quel montant total me doit-on actuellement ?',
  'Comment évoluent mes dépenses ?',
];

const QUOTE_EXAMPLE =
  "Devis pour Koné Électricité : 3 jours d'installation à 45 000 F/jour + 12 prises à 2 500 F";

const EDIT_EXAMPLE = 'Applique une remise de 10% au devis de M. Konaté';

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
  onUpdate,
  onConfirm,
  onCancel,
}: {
  item: Extract<ChatItem, { type: 'draft' }>;
  currency: string;
  isCreating: boolean;
  onUpdate: (draft: QuoteDraft) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { draft, status, quoteNumber } = item;
  const isEdit = draft.kind === 'edit';
  const editable = status === 'pending';
  const subtotal = draft.lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  const taxAmount = Math.round((subtotal * draft.taxRate) / 100);
  const total = subtotal + taxAmount;

  function updateLine(index: number, patch: Partial<DraftLine>) {
    onUpdate({
      ...draft,
      lines: draft.lines.map((l, i) => (i === index ? { ...l, ...patch } : l)),
    });
  }

  function removeLine(index: number) {
    onUpdate({ ...draft, lines: draft.lines.filter((_, i) => i !== index) });
  }

  function addLine() {
    onUpdate({
      ...draft,
      lines: [...draft.lines, { productId: null, description: '', quantity: 1, unitPrice: 0 }],
    });
  }

  const hasValidLines =
    draft.lines.length > 0 &&
    draft.lines.every(
      (l) =>
        l.description.trim().length > 0 &&
        l.quantity > 0 &&
        (isEdit ? true : l.unitPrice >= 0),
    ) &&
    subtotal >= 0;

  const confirmLabel = isEdit ? 'Appliquer la modification' : 'Créer le devis';
  const confirmingLabel = isEdit ? 'Application...' : 'Création...';

  return (
    <div className="flex items-start gap-3">
      <AiAvatar />
      <div className="w-full max-w-[85%] overflow-hidden rounded-2xl rounded-bl-md border border-emerald-200 bg-white shadow-md shadow-emerald-100/60">
        <div className="flex items-center justify-between gap-3 border-b border-emerald-100 bg-emerald-50/60 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-wide text-emerald-600">
              {isEdit
                ? `Modification du devis ${draft.number ?? ''}`
                : 'Brouillon de devis'}{' '}
              {editable && '· modifiable'}
            </p>
            {editable && draft.client.id === null ? (
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="text"
                  value={draft.client.name}
                  onChange={(e) =>
                    onUpdate({ ...draft, client: { ...draft.client, name: e.target.value } })
                  }
                  className="w-full rounded-lg border border-emerald-200 bg-white px-2 py-1 font-display text-sm font-semibold text-ink-950 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-100"
                />
                <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                  nouveau
                </span>
              </div>
            ) : (
              <p className="truncate font-display text-sm font-semibold text-ink-950">
                {draft.client.name}
                {draft.client.id === null && (
                  <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                    nouveau client
                  </span>
                )}
              </p>
            )}
            {isEdit && draft.summary && (
              <p className="mt-0.5 truncate text-xs text-gray-400">{draft.summary}</p>
            )}
          </div>
          {status === 'created' && (
            <span className="shrink-0 rounded-full bg-emerald-500 px-3 py-1 text-xs font-medium text-white">
              ✓ {isEdit ? 'Modifié' : 'Créé'} {quoteNumber ? `· ${quoteNumber}` : ''}
            </span>
          )}
          {status === 'cancelled' && (
            <span className="shrink-0 rounded-full bg-gray-200 px-3 py-1 text-xs font-medium text-gray-500">
              Annulé
            </span>
          )}
        </div>

        <div className="px-4 py-3">
          {editable ? (
            <div className="space-y-2">
              {/* En-têtes */}
              <div className="grid grid-cols-[1fr_64px_110px_90px_28px] items-center gap-2 px-1 text-[10px] font-medium uppercase tracking-wide text-gray-400">
                <span>Description</span>
                <span className="text-right">Qté</span>
                <span className="text-right">Prix unit.</span>
                <span className="text-right">Total</span>
                <span />
              </div>
              {draft.lines.map((line, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[1fr_64px_110px_90px_28px] items-center gap-2"
                >
                  <input
                    type="text"
                    value={line.description}
                    onChange={(e) => updateLine(i, { description: e.target.value })}
                    placeholder="Description..."
                    className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-sm text-gray-700 outline-none focus:border-emerald-400 focus:bg-white focus:ring-1 focus:ring-emerald-100"
                  />
                  <input
                    type="number"
                    min={1}
                    value={line.quantity}
                    onChange={(e) =>
                      updateLine(i, { quantity: Math.max(0, Number(e.target.value)) })
                    }
                    className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-right text-sm text-gray-700 outline-none focus:border-emerald-400 focus:bg-white focus:ring-1 focus:ring-emerald-100"
                  />
                  <input
                    type="number"
                    step="any"
                    {...(isEdit ? {} : { min: 0 })}
                    value={line.unitPrice / 100}
                    onChange={(e) => {
                      const value = Math.round(Number(e.target.value) * 100);
                      updateLine(i, { unitPrice: isEdit ? value : Math.max(0, value) });
                    }}
                    className={`rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-right text-sm outline-none focus:border-emerald-400 focus:bg-white focus:ring-1 focus:ring-emerald-100 ${
                      line.unitPrice < 0 ? 'text-coral-500' : 'text-gray-700'
                    }`}
                  />
                  <span
                    className={`truncate text-right text-sm font-medium ${
                      line.unitPrice < 0 ? 'text-coral-500' : 'text-ink-950'
                    }`}
                  >
                    {formatMoney(line.unitPrice * line.quantity, currency)}
                  </span>
                  <button
                    onClick={() => removeLine(i)}
                    className="rounded-md p-1 text-gray-300 transition hover:bg-coral-50 hover:text-coral-500"
                    aria-label="Supprimer la ligne"
                    title="Supprimer la ligne"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                onClick={addLine}
                className="mt-1 rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-xs text-gray-400 transition hover:border-emerald-300 hover:text-emerald-600"
              >
                + Ajouter une ligne
              </button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {draft.lines.map((line, i) => (
                  <tr key={i} className="border-b border-gray-100 last:border-0">
                    <td className="py-2 pr-2 text-gray-700">{line.description}</td>
                    <td className="whitespace-nowrap py-2 pr-2 text-right text-gray-400">
                      {line.quantity} × {formatMoney(line.unitPrice, currency)}
                    </td>
                    <td
                      className={`whitespace-nowrap py-2 text-right font-medium ${
                        line.unitPrice < 0 ? 'text-coral-500' : 'text-ink-950'
                      }`}
                    >
                      {formatMoney(line.unitPrice * line.quantity, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="mt-3 space-y-1 border-t border-gray-100 pt-3 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>Sous-total</span>
              <span>{formatMoney(subtotal, currency)}</span>
            </div>
            <div className="flex items-center justify-between text-gray-500">
              <span className="flex items-center gap-2">
                Taxe
                {editable ? (
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step="any"
                    value={draft.taxRate}
                    onChange={(e) =>
                      onUpdate({ ...draft, taxRate: Math.max(0, Number(e.target.value)) })
                    }
                    className="w-16 rounded-lg border border-gray-200 bg-gray-50 px-2 py-0.5 text-right text-xs outline-none focus:border-emerald-400 focus:bg-white"
                  />
                ) : (
                  <span>({draft.taxRate}%)</span>
                )}
                {editable && <span className="text-xs">%</span>}
              </span>
              <span>{formatMoney(taxAmount, currency)}</span>
            </div>
            <div className="flex justify-between font-display text-base font-semibold text-emerald-600">
              <span>Total</span>
              <span>{formatMoney(total, currency)}</span>
            </div>
          </div>
        </div>

        {status === 'pending' && (
          <div className="border-t border-gray-100 px-4 py-3">
            <div className="flex gap-2">
              <button
                onClick={onConfirm}
                disabled={isCreating || !hasValidLines || !draft.client.name.trim()}
                className="flex-1 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-emerald-200/60 transition hover:from-emerald-600 hover:to-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isCreating ? confirmingLabel : confirmLabel}
              </button>
              <button
                onClick={onCancel}
                disabled={isCreating}
                className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-500 transition hover:bg-gray-50 disabled:opacity-50"
              >
                Annuler
              </button>
            </div>
            {isEdit && (
              <p className="mt-2 text-center text-[11px] text-gray-300">
                Tu peux continuer la conversation pour ajuster ce brouillon avant d'appliquer.
              </p>
            )}
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

  const [mode, setMode] = useState<Mode>('chat');
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

  // Session de modification active = dernière carte 'edit' encore en attente.
  // Son état (y compris les retouches manuelles) est renvoyé à l'IA à chaque tour.
  function findActiveEditIndex(list: ChatItem[]): number {
    for (let i = list.length - 1; i >= 0; i--) {
      const it = list[i];
      if (it.type === 'draft' && it.draft.kind === 'edit' && it.status === 'pending') {
        return i;
      }
    }
    return -1;
  }

  function textHistory(list: ChatItem[]) {
    return list
      .filter((it): it is Extract<ChatItem, { type: 'text' }> => it.type === 'text')
      .slice(-10)
      .map((it) => ({ role: it.role, content: it.content }));
  }

  async function sendChat(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    setError(null);
    const history = textHistory(items);

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
      const raw = response.data?.data?.draft;
      const draft: QuoteDraft = { kind: 'create', ...raw };
      setItems((prev) => [
        ...prev,
        {
          type: 'text',
          role: 'assistant',
          content:
            "Voici le brouillon que j'ai préparé. Tu peux modifier chaque ligne avant de confirmer :",
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

  async function sendEditQuote(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    setError(null);

    // Brouillon en cours (avec les éventuelles retouches manuelles de l'utilisateur)
    const activeIndex = findActiveEditIndex(items);
    const activeItem =
      activeIndex >= 0 ? (items[activeIndex] as Extract<ChatItem, { type: 'draft' }>) : null;
    const currentDraft = activeItem
      ? {
          quoteId: activeItem.draft.quoteId,
          clientId: activeItem.draft.client.id,
          clientName: activeItem.draft.client.name,
          lines: activeItem.draft.lines,
          taxRate: activeItem.draft.taxRate,
        }
      : undefined;

    const history = textHistory(items);

    setItems((prev) => [...prev, { type: 'text', role: 'user', content: trimmed }]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await api.post('/assistant/edit-quote', {
        text: trimmed,
        history,
        draft: currentDraft,
      });
      const raw = response.data?.data?.draft;
      const reply: string = response.data?.data?.reply ?? 'Voici la version mise à jour.';
      const draft: QuoteDraft = {
        kind: 'edit',
        client: { id: raw.clientId ?? null, name: raw.clientName },
        lines: raw.lines,
        taxRate: raw.taxRate,
        quoteId: raw.quoteId,
        number: raw.number,
        summary: raw.summary,
      };

      setItems((prev) => {
        // On retire l'ancienne carte en attente (si même session) et on remet
        // la carte à jour en bas, juste après la réponse de l'IA.
        const idx = findActiveEditIndex(prev);
        const without =
          idx >= 0 &&
          (prev[idx] as Extract<ChatItem, { type: 'draft' }>).draft.quoteId === raw.quoteId
            ? prev.filter((_, i) => i !== idx)
            : prev;
        return [
          ...without,
          { type: 'text', role: 'assistant', content: reply },
          { type: 'draft', draft, status: 'pending' },
        ];
      });
    } catch (err: any) {
      setError(
        apiErrorMessage(
          err,
          "Je n'ai pas réussi à préparer cette modification. Précise le devis visé (numéro ou client).",
        ),
      );
      setItems((prev) => prev.slice(0, -1));
      setInput(trimmed);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }

  function updateDraft(index: number, draft: QuoteDraft) {
    setItems((prev) =>
      prev.map((it, i) => (i === index && it.type === 'draft' ? { ...it, draft } : it)),
    );
  }

  async function confirmDraft(index: number) {
    const item = items[index];
    if (!item || item.type !== 'draft' || item.status !== 'pending') return;

    setCreatingIndex(index);
    setError(null);
    try {
      let quoteNumber: string | undefined;

      // Dans les deux cas : si le client visé n'existe pas encore, on le crée d'abord
      let clientId = item.draft.client.id;
      if (!clientId) {
        const clientRes = await api.post('/clients', {
          name: item.draft.client.name.trim(),
        });
        clientId = clientRes.data.data.id;
      }

      const linesPayload = item.draft.lines.map((l) => ({
        productId: l.productId ?? undefined,
        description: l.description.trim(),
        quantity: l.quantity,
        unitPrice: l.unitPrice, // déjà en centimes
      }));

      if (item.draft.kind === 'edit') {
        // Modification d'un devis existant (lignes, taxe et éventuellement client)
        const res = await api.patch(`/quotes/${item.draft.quoteId}`, {
          clientId,
          taxRate: item.draft.taxRate,
          lines: linesPayload,
        });
        quoteNumber = res.data?.data?.number ?? item.draft.number;
      } else {
        const quoteRes = await api.post('/quotes', {
          clientId,
          taxRate: item.draft.taxRate,
          lines: linesPayload,
        });
        quoteNumber = quoteRes.data?.data?.number;
      }

      setItems((prev) =>
        prev.map((it, i) =>
          i === index && it.type === 'draft' ? { ...it, status: 'created', quoteNumber } : it,
        ),
      );
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    } catch (err: any) {
      setError(
        apiErrorMessage(
          err,
          item.draft.kind === 'edit'
            ? 'La modification du devis a échoué. Réessaie.'
            : 'La création du devis a échoué. Réessaie.',
        ),
      );
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
    } else if (mode === 'edit') {
      sendEditQuote(input);
    } else {
      sendChat(input);
    }
  }

  const isEmpty = items.length === 0 && !isLoading;
  const hasActiveEditSession = findActiveEditIndex(items) >= 0;

  const modeTabs: { id: Mode; label: string }[] = [
    { id: 'chat', label: '💬 Questions' },
    { id: 'quote', label: '✦ Rédiger un devis' },
    { id: 'edit', label: '✏️ Modifier un devis' },
  ];

  return (
    <Layout
      title="Dalem AI ✦"
      subtitle="Ton assistant business intelligent. Pose une question, dicte ou modifie un devis."
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
              {mode === 'chat' && (
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
              )}
              {mode === 'quote' && (
                <>
                  <p className="mt-1 max-w-md text-sm text-gray-400">
                    Décris ton devis en une phrase : client, prestations, quantités et prix.
                    Je prépare un brouillon modifiable, tu valides avant création.
                  </p>
                  <button
                    onClick={() => setInput(QUOTE_EXAMPLE)}
                    className="animate-fade-slide-up mt-6 max-w-lg rounded-xl border border-dashed border-emerald-300 bg-emerald-50/50 px-4 py-3 text-left text-sm text-emerald-700 transition hover:bg-emerald-50"
                  >
                    Exemple : « {QUOTE_EXAMPLE} »
                  </button>
                </>
              )}
              {mode === 'edit' && (
                <>
                  <p className="mt-1 max-w-md text-sm text-gray-400">
                    Dis-moi quoi changer sur un devis existant, puis affine en discutant :
                    remises, prix, quantités, lignes, taxe, client. Seuls les devis en
                    brouillon ou envoyés (non facturés) sont modifiables.
                  </p>
                  <button
                    onClick={() => setInput(EDIT_EXAMPLE)}
                    className="animate-fade-slide-up mt-6 max-w-lg rounded-xl border border-dashed border-emerald-300 bg-emerald-50/50 px-4 py-3 text-left text-sm text-emerald-700 transition hover:bg-emerald-50"
                  >
                    Exemple : « {EDIT_EXAMPLE} »
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
                      onUpdate={(draft) => updateDraft(i, draft)}
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
            {modeTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setMode(tab.id)}
                className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  mode === tab.id
                    ? 'bg-white text-emerald-600 shadow-sm'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
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
                  : mode === 'edit'
                    ? hasActiveEditSession
                      ? 'Continue : "mets plutôt 15%", "change le client", "nouveau total ?"...'
                      : 'Décris la modification : quel devis, quel changement...'
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
              {mode === 'chat' ? 'Envoyer' : hasActiveEditSession && mode === 'edit' ? 'Ajuster' : 'Préparer'}
            </button>
          </div>
          <p className="mt-2 text-center text-[11px] text-gray-300">
            Dalem AI répond à partir des données de ton entreprise. Vérifie toujours les montants avant de valider un document.
          </p>
        </div>
      </div>
    </Layout>
  );
}
