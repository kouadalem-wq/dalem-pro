// src/pages/LoginPage.tsx

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Une erreur est survenue.');
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
      {/* Panneau gauche — identité de marque, visible seulement sur grand écran */}
      <div className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-12">
        {/* Halo décoratif */}
        <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-emerald-600/20 blur-3xl" />

        <div className="relative z-10 font-display text-xl font-bold text-white">
          Dalem<span className="text-emerald-400">_</span>Pro
        </div>

        <div className="relative z-10 max-w-md">
          <p className="font-display text-4xl font-semibold leading-tight text-white">
            La gestion de votre entreprise,{' '}
            <span className="text-emerald-400">simplifiée</span>.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-white/75">
            Devis, factures, paiements et stock — tout ce dont votre PME a besoin,
            réuni dans un seul outil pensé pour l'Afrique.
          </p>

          <div className="mt-10 flex gap-6">
            <div>
              <p className="font-display text-2xl font-bold text-white">100%</p>
              <p className="text-xs text-white/60">Multi-devises</p>
            </div>
            <div>
              <p className="font-display text-2xl font-bold text-white">24/7</p>
              <p className="text-xs text-white/60">Accès sécurisé</p>
            </div>
          </div>
        </div>

        <p className="relative z-10 text-xs text-white/50">
          © 2026 Dalem_Pro. Tous droits réservés.
        </p>
      </div>

      {/* Panneau droit — formulaire, sur le même dégradé continu */}
      <div className="relative flex items-center justify-center overflow-hidden px-6 py-12">
        {/* Grille de points décorative, uniquement sur la moitié claire */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(circle, #6b8f7c 1.5px, transparent 1.5px)',
            backgroundSize: '22px 22px',
            opacity: 0.2,
          }}
        />
        <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-emerald-400/30 blur-3xl" />

        {/* Carte verre dépoli : garantit un fond clair constant sous le texte,
            peu importe où se trouve la zone de transition du dégradé derrière */}
        <div className="relative z-10 w-full max-w-sm rounded-2xl border border-white/60 bg-white/70 p-8 shadow-xl shadow-emerald-900/5 backdrop-blur-xl">
          <div className="mb-2 font-display text-lg font-bold text-ink-950 lg:hidden">
            Dalem<span className="text-emerald-600">_</span>Pro
          </div>
          <h1 className="font-display text-2xl font-semibold text-ink-950">
            Content de vous revoir
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Connectez-vous pour continuer.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {error && (
              <div className="rounded-lg bg-coral-500/10 px-3 py-2.5 text-sm text-coral-500">
                {error}
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-gray-700">Email professionnel</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-ink-950 shadow-sm outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                placeholder="vous@entreprise.com"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700">Mot de passe</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-ink-950 shadow-sm outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                placeholder="••••••••"
              />
              <Link
                to="/forgot-password"
                className="mt-1.5 inline-block text-xs font-medium text-emerald-600 hover:text-emerald-700"
              >
                Mot de passe oublié ?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-ink-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-600 disabled:opacity-50"
            >
              {isSubmitting ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            Pas encore de compte ?{' '}
            <Link to="/register" className="font-medium text-emerald-600 hover:text-emerald-700">
              Créer mon entreprise
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
