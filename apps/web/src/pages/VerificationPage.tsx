// src/pages/VerificationPage.tsx
// Page PUBLIQUE de verification d'un document (accessible en scannant le QR).
// Pas de connexion requise. Reprend le fond decoratif de l'application.

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

type VerifData = {
  authentique: boolean;
  type: 'FACTURE' | 'DEVIS';
  numero: string;
  date: string;
  montantTotal: number;
  devise: string;
  entreprise: string | null;
  client: string | null;
  statut: string;
};

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

// Fond decoratif commun (halos), identique a l'esprit du dashboard.
function FondDecoratif() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute -right-32 -top-52 h-[44rem] w-[44rem] rounded-full opacity-[0.6] blur-3xl"
        style={{ background: 'radial-gradient(circle, #0d9165 0%, transparent 70%)' }}
      />
      <div
        className="absolute -left-44 top-1/3 h-[32rem] w-[32rem] rounded-full opacity-[0.32] blur-3xl"
        style={{ background: 'radial-gradient(circle, #0a0f0d 0%, transparent 68%)' }}
      />
      <div
        className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full opacity-[0.28] blur-3xl"
        style={{ background: 'radial-gradient(circle, #f2634a 0%, transparent 72%)' }}
      />
      <div
        className="absolute -left-20 -top-20 h-[30rem] w-[30rem] rounded-full opacity-70 blur-3xl"
        style={{ background: 'radial-gradient(circle, #f7f8f7 0%, transparent 60%)' }}
      />
    </div>
  );
}

export function VerificationPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<VerifData | null>(null);
  const [statut, setStatut] = useState<'chargement' | 'ok' | 'introuvable'>('chargement');

  useEffect(() => {
    fetch(`${API_URL}/verify/${token}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((res) => {
        setData(res.data);
        setStatut('ok');
      })
      .catch(() => setStatut('introuvable'));
  }, [token]);

  const money = (cents: number, devise: string) =>
    new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: devise,
      maximumFractionDigits: devise === 'XOF' ? 0 : 2,
    }).format(cents / 100).replace(/[\u00A0\u202F]/g, ' ');

  const dateLongue = (iso: string) =>
    new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#eef1ee] px-4">
      <FondDecoratif />

      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-8 shadow-lg shadow-gray-300/40">

        {statut === 'chargement' && (
          <p className="text-center text-sm text-gray-400">Vérification en cours…</p>
        )}

        {statut === 'introuvable' && (
          <div className="text-center">
            {/* Bandeau d'alerte fort : cas de fraude plausible */}
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-coral-50">
              <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#c0392b" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
                  strokeLinecap="round" strokeLinejoin="round" />
                <line x1="12" y1="9" x2="12" y2="13" strokeLinecap="round" />
                <line x1="12" y1="17" x2="12.01" y2="17" strokeLinecap="round" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-ink-950">Document non authentifié</h1>
            <div className="mx-auto mt-4 rounded-xl border border-coral-200 bg-coral-50 px-4 py-3">
              <p className="text-sm font-medium text-coral-700">
                ⚠️ Ce code ne correspond à aucun document émis via Dalem_Pro.
              </p>
              <p className="mt-1.5 text-sm text-coral-600">
                Ne réglez aucun paiement sur la base de ce document sans le confirmer directement auprès de l'entreprise émettrice.
              </p>
            </div>
          </div>
        )}

        {statut === 'ok' && data && (
          <div>
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#0d9165" strokeWidth="2.5">
                  <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h1 className="text-xl font-semibold text-ink-950">Document authentique</h1>
              <p className="mt-2 text-sm text-gray-500">
                Ce document a bien été émis par {data.entreprise}.
              </p>
            </div>

            <div className="mt-6 space-y-3 border-t border-gray-100 pt-6 text-sm">
              <Ligne label="Type" valeur={data.type === 'FACTURE' ? 'Facture' : 'Devis'} />
              <Ligne label="Numéro" valeur={data.numero} />
              <Ligne label="Émis par" valeur={data.entreprise ?? '—'} />
              <Ligne label="Client" valeur={data.client ?? '—'} />
              <Ligne label="Date" valeur={dateLongue(data.date)} />
              <Ligne label="Montant" valeur={money(data.montantTotal, data.devise)} />
            </div>

            <p className="mt-6 text-center text-xs text-gray-400">
              Vérifié par Dalem_Pro
            </p>
          </div>
        )}

      </div>
    </div>
  );
}

function Ligne({ label, valeur }: { label: string; valeur: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-ink-950">{valeur}</span>
    </div>
  );
}