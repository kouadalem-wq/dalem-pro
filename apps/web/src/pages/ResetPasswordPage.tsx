// src/pages/ResetPasswordPage.tsx
// Utilisée à la fois pour "mot de passe oublié" et pour "définir mon mot de
// passe" lors d'une invitation employé — même mécanisme de token côté backend.

import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { getErrorMessage } from '../lib/errors';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Les deux mots de passe ne correspondent pas.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/auth/reset-password', { token, newPassword });
      setIsSuccess(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
        <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-md">
          <p className="text-sm text-coral-500">
            Lien invalide — aucun token trouvé. Vérifiez que vous avez bien cliqué sur le lien complet reçu par email.
          </p>
          <Link to="/forgot-password" className="mt-4 inline-block text-sm font-medium text-emerald-600">
            Demander un nouveau lien
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-6"
      style={{
        background:
          'linear-gradient(115deg, #0a0f0d 0%, #0a0f0d 38%, #0f2a1f 48%, #17392a 54%, #cdeadb 64%, #eaf7f0 76%, #f4f7f4 100%)',
      }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(circle, #6b8f7c 1.5px, transparent 1.5px)',
          backgroundSize: '22px 22px',
          opacity: 0.2,
        }}
      />

      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-white/60 bg-white/70 p-8 shadow-xl shadow-emerald-900/5 backdrop-blur-xl">
        <div className="mb-2 font-display text-lg font-bold text-ink-950">
          Dalem<span className="text-emerald-600">_</span>Pro
        </div>

        {isSuccess ? (
          <>
            <h1 className="font-display text-xl font-semibold text-ink-950">Mot de passe défini !</h1>
            <p className="mt-3 text-sm text-gray-600">
              Redirection vers la page de connexion...
            </p>
          </>
        ) : (
          <>
            <h1 className="font-display text-xl font-semibold text-ink-950">Nouveau mot de passe</h1>
            <p className="mt-1 text-sm text-gray-500">Choisissez un mot de passe sécurisé.</p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {error && (
                <div className="rounded-lg bg-coral-500/10 px-3 py-2.5 text-sm text-coral-500">{error}</div>
              )}

              <div>
                <label className="text-xs font-medium text-gray-700">Nouveau mot de passe</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-ink-950 shadow-sm outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="8 caractères minimum"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700">Confirmer le mot de passe</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-ink-950 shadow-sm outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-lg bg-ink-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-600 disabled:opacity-50"
              >
                {isSubmitting ? 'Enregistrement...' : 'Définir le mot de passe'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
