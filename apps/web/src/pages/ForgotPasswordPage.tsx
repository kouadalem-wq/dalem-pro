// src/pages/ForgotPasswordPage.tsx

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { getErrorMessage } from '../lib/errors';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await api.post('/auth/forgot-password', { email });
      // Message générique affiché quoi qu'il arrive — cohérent avec la
      // sécurité du backend qui ne révèle jamais si un email existe
      setIsSubmitted(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
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

        {isSubmitted ? (
          <>
            <h1 className="font-display text-xl font-semibold text-ink-950">Vérifiez vos emails</h1>
            <p className="mt-3 text-sm text-gray-600">
              Si un compte existe avec l'adresse <strong>{email}</strong>, un lien de
              réinitialisation vient de lui être envoyé. Pensez à vérifier vos spams.
            </p>
            <Link
              to="/login"
              className="mt-6 inline-block text-sm font-medium text-emerald-600 hover:text-emerald-700"
            >
              ← Retour à la connexion
            </Link>
          </>
        ) : (
          <>
            <h1 className="font-display text-xl font-semibold text-ink-950">Mot de passe oublié ?</h1>
            <p className="mt-1 text-sm text-gray-500">
              Entrez votre email, nous vous enverrons un lien de réinitialisation.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {error && (
                <div className="rounded-lg bg-coral-500/10 px-3 py-2.5 text-sm text-coral-500">{error}</div>
              )}

              <div>
                <label className="text-xs font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-ink-950 shadow-sm outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="vous@entreprise.com"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-lg bg-ink-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-600 disabled:opacity-50"
              >
                {isSubmitting ? 'Envoi...' : 'Envoyer le lien'}
              </button>
            </form>

            <Link
              to="/login"
              className="mt-6 inline-block text-sm font-medium text-gray-600 hover:text-gray-800"
            >
              ← Retour à la connexion
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
