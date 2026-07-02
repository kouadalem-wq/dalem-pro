// src/pages/RegisterPage.tsx

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    companyName: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    currency: 'XOF',
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await register(form);
      navigate('/dashboard');
    } catch (err: any) {
      const message = err.response?.data?.message;
      setError(Array.isArray(message) ? message.join(' ') : message ?? 'Une erreur est survenue.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="relative grid min-h-screen overflow-hidden lg:grid-cols-2"
      style={{
        background:
          'linear-gradient(115deg, #0a0f0d 0%, #0a0f0d 38%, #0f2a1f 48%, #17392a 54%, #cdeadb 64%, #eaf7f0 76%, #f4f7f4 100%)',
      }}
    >
      <div className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-emerald-600/20 blur-3xl" />

        <div className="relative z-10 font-display text-xl font-bold text-white">
          Dalem<span className="text-emerald-400">_</span>Pro
        </div>

        <div className="relative z-10 max-w-md">
          <p className="font-display text-4xl font-semibold leading-tight text-white">
            Rejoignez les entreprises qui gagnent du{' '}
            <span className="text-emerald-400">temps</span>.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-white/75">
            La création de votre espace prend moins de deux minutes. Aucune carte
            bancaire requise pour commencer.
          </p>
        </div>

        <p className="relative z-10 text-xs text-white/50">
          © 2026 Dalem_Pro. Tous droits réservés.
        </p>
      </div>

      <div className="relative flex items-center justify-center overflow-hidden px-6 py-10">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(circle, #6b8f7c 1.5px, transparent 1.5px)',
            backgroundSize: '22px 22px',
            opacity: 0.2,
          }}
        />
        <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-emerald-400/30 blur-3xl" />

        <div className="relative z-10 w-full max-w-sm rounded-2xl border border-white/60 bg-white/70 p-8 shadow-xl shadow-emerald-900/5 backdrop-blur-xl">
          <div className="mb-2 font-display text-lg font-bold text-ink-950 lg:hidden">
            Dalem<span className="text-emerald-600">_</span>Pro
          </div>
          <h1 className="font-display text-2xl font-semibold text-ink-950">
            Créez votre espace
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Commencez à facturer en quelques minutes.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-3.5">
            {error && (
              <div className="rounded-lg bg-coral-500/10 px-3 py-2.5 text-sm text-coral-500">
                {error}
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-gray-700">Nom de l'entreprise</label>
              <input
                required
                value={form.companyName}
                onChange={(e) => update('companyName', e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-ink-950 shadow-sm outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                placeholder="Boulangerie Mbaye"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-700">Prénom</label>
                <input
                  required
                  value={form.firstName}
                  onChange={(e) => update('firstName', e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-ink-950 shadow-sm outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">Nom</label>
                <input
                  required
                  value={form.lastName}
                  onChange={(e) => update('lastName', e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-ink-950 shadow-sm outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700">Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-ink-950 shadow-sm outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700">Mot de passe</label>
              <input
                type="password"
                required
                minLength={8}
                value={form.password}
                onChange={(e) => update('password', e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-ink-950 shadow-sm outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                placeholder="8 caractères minimum"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700">Devise</label>
              <select
                value={form.currency}
                onChange={(e) => update('currency', e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-ink-950 shadow-sm outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="XOF">FCFA (XOF)</option>
                <option value="CAD">Dollar canadien (CAD)</option>
                <option value="EUR">Euro (EUR)</option>
                <option value="USD">Dollar américain (USD)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-ink-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-600 disabled:opacity-50"
            >
              {isSubmitting ? 'Création...' : 'Créer mon compte'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-gray-600">
            Déjà un compte ?{' '}
            <Link to="/login" className="font-medium text-emerald-600 hover:text-emerald-700">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
