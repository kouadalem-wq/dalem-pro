// src/components/ConfirmDialog.tsx
// Modale de confirmation cohérente avec le design system, à utiliser partout
// dans l'app à la place de la boîte de dialogue native du navigateur.

type ConfirmDialogProps = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
};

export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  variant = 'default',
  onConfirm,
  onCancel,
  isLoading = false,
}: ConfirmDialogProps) {
  const isDanger = variant === 'danger';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Voile sombre en arrière-plan */}
      <div className="absolute inset-0 bg-ink-950/50 backdrop-blur-sm" onClick={onCancel} />

      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-gray-100 bg-white p-6 shadow-2xl">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg ${
              isDanger ? 'bg-coral-500/10 text-coral-500' : 'bg-emerald-50 text-emerald-600'
            }`}
          >
            {isDanger ? '⚠' : '?'}
          </div>
          <div>
            <h2 className="font-display text-base font-semibold text-ink-950">{title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-gray-600">{message}</p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors disabled:opacity-50 ${
              isDanger ? 'bg-coral-500 hover:bg-coral-600' : 'bg-ink-950 hover:bg-emerald-600'
            }`}
          >
            {isLoading ? 'En cours...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
