// src/components/ScanReceiptButton.tsx
// Bouton "📸 Scanner un reçu" : l'utilisateur choisit/prend une photo de reçu,
// Dalem AI (Gemini vision) en extrait montant, fournisseur, catégorie et date,
// puis une modale ÉDITABLE permet de vérifier avant de créer la dépense.
// L'IA propose, l'humain valide — comme partout dans Dalem_Pro.
import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

const CATEGORY_LABELS: Record<string, string> = {
  SUPPLIES: 'Fournitures / Marchandises',
  RENT: 'Loyer',
  SALARY: 'Salaires',
  TRANSPORT: 'Transport',
  MARKETING: 'Marketing',
  UTILITIES: 'Eau / Électricité / Internet',
  TAXES: 'Impôts & taxes',
  OTHER: 'Autre',
};

type ScanDraft = {
  amount: number; // en centimes
  description: string;
  category: string;
  date: string | null;
  vendor: string | null;
};

function scanErrorMessage(err: any): string {
  const msg = err?.response?.data?.message;
  if (Array.isArray(msg)) return msg.join(' ');
  if (typeof msg === 'string') return msg;
  if (err?.response?.status === 429)
    return 'Le scan est très sollicité. Réessaie dans une minute.';
  if (err?.response?.status === 413)
    return "L'image est trop lourde. Réessaie avec une photo plus petite.";
  return "Le scan a échoué. Réessaie avec une photo plus nette.";
}

// Compresse l'image côté client (max 1600px, JPEG qualité 0.8) :
// accélère l'upload et évite les erreurs de taille.
async function compressImage(file: File): Promise<{ base64: string; mimeType: string }> {
  const dataUrl: string = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Lecture du fichier impossible'));
    reader.readAsDataURL(file);
  });

  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Image illisible'));
    img.src = dataUrl;
  });

  const MAX_SIZE = 1600;
  let { width, height } = img;
  if (width > MAX_SIZE || height > MAX_SIZE) {
    const ratio = Math.min(MAX_SIZE / width, MAX_SIZE / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    // Fallback : envoie l'original tel quel
    const base64 = dataUrl.split(',')[1];
    return { base64, mimeType: file.type || 'image/jpeg' };
  }
  ctx.drawImage(img, 0, 0, width, height);

  const compressedUrl = canvas.toDataURL('image/jpeg', 0.8);
  return { base64: compressedUrl.split(',')[1], mimeType: 'image/jpeg' };
}

export function ScanReceiptButton() {
  const { tenant } = useAuth();
  const currency = tenant?.currency ?? 'XOF';
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [draft, setDraft] = useState<ScanDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState(false);

  function reset() {
    setDraft(null);
    setError(null);
    setPreview(null);
    setCreated(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleFileSelected(file: File | undefined) {
    if (!file) return;
    reset();
    setIsOpen(true);
    setIsScanning(true);

    try {
      const { base64, mimeType } = await compressImage(file);
      setPreview(`data:${mimeType};base64,${base64}`);

      const res = await api.post('/assistant/scan-receipt', {
        imageBase64: base64,
        mimeType,
      });
      setDraft(res.data?.data?.draft ?? null);
    } catch (err: any) {
      setError(scanErrorMessage(err));
    } finally {
      setIsScanning(false);
    }
  }

  async function handleCreate() {
    if (!draft || draft.amount <= 0 || !draft.description.trim()) return;
    setIsCreating(true);
    setError(null);
    try {
      await api.post('/expenses', {
        description: draft.description.trim(),
        amount: Math.round(draft.amount), // déjà en centimes
        category: draft.category,
        ...(draft.date ? { date: draft.date } : {}),
      });
      setCreated(true);
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      setTimeout(() => {
        setIsOpen(false);
        reset();
      }, 1500);
    } catch (err: any) {
      setError(scanErrorMessage(err));
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFileSelected(e.target.files?.[0])}
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        className="flex items-center gap-2 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-emerald-200/60 transition hover:from-emerald-600 hover:to-emerald-700"
        title="Photographier un reçu et créer la dépense automatiquement"
      >
        <span aria-hidden>📸</span> Scanner un reçu ✦
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-[2px]"
          onClick={() => !isScanning && !isCreating && (setIsOpen(false), reset())}
        >
          <div
            className="animate-fade-slide-up flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* En-tête */}
            <div className="flex items-center justify-between border-b border-emerald-100 bg-emerald-50/60 px-5 py-4">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-emerald-600">
                  Scan de reçu Dalem AI ✦
                </p>
                <p className="font-display text-sm font-semibold text-ink-950">
                  {isScanning ? 'Analyse en cours...' : created ? 'Dépense créée !' : 'Vérifie avant de créer'}
                </p>
              </div>
              <button
                onClick={() => {
                  setIsOpen(false);
                  reset();
                }}
                className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                aria-label="Fermer"
              >
                ✕
              </button>
            </div>

            {/* Corps */}
            <div className="max-h-[70vh] overflow-y-auto p-5">
              {preview && (
                <img
                  src={preview}
                  alt="Reçu scanné"
                  className="mb-4 max-h-40 w-full rounded-xl border border-gray-200 object-contain"
                />
              )}

              {isScanning ? (
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-gray-400">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-400 [animation-delay:0ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-400 [animation-delay:150ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-400 [animation-delay:300ms]" />
                  <span className="ml-2">Lecture du reçu...</span>
                </div>
              ) : error ? (
                <div className="rounded-xl border border-coral-200 bg-coral-50 px-4 py-3 text-sm text-coral-600">
                  {error}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="ml-2 font-medium underline hover:no-underline"
                  >
                    Reprendre une photo
                  </button>
                </div>
              ) : created ? (
                <div className="flex items-center justify-center gap-2 py-6 text-sm font-medium text-emerald-600">
                  ✓ Dépense enregistrée avec succès
                </div>
              ) : draft ? (
                <div className="space-y-3">
                  {draft.vendor && (
                    <p className="text-xs text-gray-400">
                      Fournisseur détecté : <span className="font-medium text-gray-600">{draft.vendor}</span>
                    </p>
                  )}

                  <div>
                    <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-400">
                      Description
                    </label>
                    <input
                      type="text"
                      value={draft.description}
                      onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-400">
                        Montant ({currency})
                      </label>
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={draft.amount / 100}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            amount: Math.max(0, Math.round(Number(e.target.value) * 100)),
                          })
                        }
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-medium text-ink-950 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-400">
                        Date
                      </label>
                      <input
                        type="date"
                        value={draft.date ?? ''}
                        onChange={(e) => setDraft({ ...draft, date: e.target.value || null })}
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-400">
                      Catégorie
                    </label>
                    <select
                      value={draft.category}
                      onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                    >
                      {Object.entries(CATEGORY_LABELS).map(([value, labelText]) => (
                        <option key={value} value={value}>
                          {labelText}
                        </option>
                      ))}
                    </select>
                  </div>

                  <p className="text-[11px] text-gray-300">
                    Vérifie le montant et la catégorie : l'IA lit le reçu, mais c'est toi qui valides.
                  </p>
                </div>
              ) : null}
            </div>

            {/* Actions */}
            {!isScanning && !error && !created && draft && (
              <div className="flex gap-2 border-t border-gray-100 px-5 py-4">
                <button
                  onClick={handleCreate}
                  disabled={isCreating || draft.amount <= 0 || !draft.description.trim()}
                  className="flex-1 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-emerald-200/60 transition hover:from-emerald-600 hover:to-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isCreating ? 'Création...' : 'Créer la dépense'}
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isCreating}
                  className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-500 transition hover:bg-gray-50 disabled:opacity-50"
                  title="Reprendre une photo"
                >
                  📸
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
