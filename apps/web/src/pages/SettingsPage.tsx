// src/pages/SettingsPage.tsx
import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Layout } from '../components/Layout';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { getErrorMessage } from '../lib/errors';
import { useAuth } from '../context/AuthContext';

type Tenant = {
  id: string;
  name: string;
  logo: string | null;
  signature: string | null;
  pdfTemplate: 'MODERN' | 'CLASSIC';
  soldeInitial: number;
  currency: string;
};

const templates: {
  value: 'MODERN' | 'CLASSIC';
  label: string;
  description: string;
}[] = [
  {
    value: 'MODERN',
    label: 'Moderne',
    description: 'Bandeau de couleur, mise en page dynamique — idéal pour une image jeune et actuelle.',
  },
  {
    value: 'CLASSIC',
    label: 'Classique',
    description: 'Noir et blanc, sobre et traditionnel — inspire confiance dans un contexte formel.',
  },
];

export function SettingsPage() {
  const queryClient = useQueryClient();
  const { refreshTenant } = useAuth();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<'MODERN' | 'CLASSIC'>('MODERN');

  // Solde de depart, affiche en FCFA (l'utilisateur ne voit jamais les centimes).
  const [soldeFcfa, setSoldeFcfa] = useState<string>('');

  // Devise selectionnee (code ISO)
  const [selectedCurrency, setSelectedCurrency] = useState<string>('XOF');

  const [confirmTarget, setConfirmTarget] = useState<'logo' | 'signature' | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type });
  }

  const { data, isLoading } = useQuery<{ data: Tenant }>({
    queryKey: ['tenant-me'],
    queryFn: async () => (await api.get('/tenants/me')).data,
  });

  useEffect(() => {
    if (data?.data) {
      setSelectedTemplate(data.data.pdfTemplate);
      // Les montants sont stockes en centimes : on divise par 100 pour l'affichage.
      const centimes = data.data.soldeInitial ?? 0;
      setSoldeFcfa(centimes > 0 ? String(Math.round(centimes / 100)) : '');
      setSelectedCurrency(data.data.currency ?? 'XOF');
    }
  }, [data]);

  const updateTemplate = useMutation({
    mutationFn: async () => (await api.patch('/tenants/me', { pdfTemplate: selectedTemplate })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-me'] });
      showToast('Modèle enregistré avec succès.', 'success');
    },
    onError: (err) => showToast(getErrorMessage(err), 'error'),
  });

  // Enregistrement du solde de depart : on reconvertit les FCFA en centimes.
  const updateSolde = useMutation({
    mutationFn: async () => {
      const fcfa = Math.max(0, Math.round(Number(soldeFcfa) || 0));
      const centimes = fcfa * 100;
      return (await api.patch('/tenants/me', { soldeInitial: centimes })).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-me'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-lifeline'] });
      showToast('Solde de départ enregistré.', 'success');
    },
    onError: (err) => showToast(getErrorMessage(err), 'error'),
  });

  // Enregistrement de la devise
  const updateCurrency = useMutation({
    mutationFn: async () =>
      (await api.patch('/tenants/me', { currency: selectedCurrency })).data,
    onSuccess: async () => {
      // Rafraichit le tenant en memoire (AuthContext) pour que la nouvelle
      // devise s'applique partout immediatement, sans reconnexion.
      await refreshTenant();
      queryClient.invalidateQueries({ queryKey: ['tenant-me'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-lifeline'] });
      showToast('Devise enregistrée.', 'success');
    },
    onError: (err) => showToast(getErrorMessage(err), 'error'),
  });

  const uploadLogo = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('logo', file);
      return (
        await api.post('/tenants/me/logo', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      ).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-me'] });
      showToast('Logo mis à jour avec succès.', 'success');
    },
    onError: (err) => showToast(getErrorMessage(err), 'error'),
  });

  const removeLogo = useMutation({
    mutationFn: async () => (await api.patch('/tenants/me', { logo: null })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-me'] });
      showToast('Logo supprimé.', 'success');
      setConfirmTarget(null);
    },
    onError: (err) => {
      showToast(getErrorMessage(err), 'error');
      setConfirmTarget(null);
    },
  });

  const uploadSignature = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('signature', file);
      return (
        await api.post('/tenants/me/signature', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      ).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-me'] });
      showToast('Signature mise à jour avec succès.', 'success');
    },
    onError: (err) => showToast(getErrorMessage(err), 'error'),
  });

  const removeSignature = useMutation({
    mutationFn: async () => (await api.patch('/tenants/me', { signature: null })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-me'] });
      showToast('Signature supprimée.', 'success');
      setConfirmTarget(null);
    },
    onError: (err) => {
      showToast(getErrorMessage(err), 'error');
      setConfirmTarget(null);
    },
  });

  function handleLogoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      uploadLogo.mutate(file);
    }
    e.target.value = '';
  }

  function handleSignatureSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      uploadSignature.mutate(file);
    }
    e.target.value = '';
  }

  function handleConfirmDelete() {
    if (confirmTarget === 'logo') {
      removeLogo.mutate();
    } else if (confirmTarget === 'signature') {
      removeSignature.mutate();
    }
  }

  const currentLogo = data?.data?.logo;
  const currentSignature = data?.data?.signature;
  const isDeleting = removeLogo.isPending || removeSignature.isPending;

  return (
    <Layout title="Paramètres" subtitle="Personnalisez l'apparence de vos documents">
      {isLoading ? (
        <p className="text-sm text-gray-400">Chargement...</p>
      ) : (
        <div className="max-w-2xl space-y-6">

          {/* ─── Argent disponible début activité ─────────────────────── */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-md shadow-gray-200/60">
            <h2 className="font-display text-sm font-semibold text-ink-950">
              Argent disponible début activité
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Combien as-tu en caisse et en banque aujourd'hui ? Cette information rend le calcul de ta
              « ligne de vie » juste dès le départ. À renseigner une seule fois.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={soldeFcfa}
                  onChange={(e) => setSoldeFcfa(e.target.value)}
                  placeholder="0"
                  className="w-48 rounded-lg border border-gray-200 bg-white px-3 py-2 pr-16 text-sm text-ink-950 shadow-sm outline-none transition-colors focus:border-emerald-500"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                  FCFA
                </span>
              </div>
              <button
                onClick={() => updateSolde.mutate()}
                disabled={updateSolde.isPending}
                className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
              >
                {updateSolde.isPending ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>

          {/* ─── Devise ───────────────────────────────────────────────── */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-md shadow-gray-200/60">
            <h2 className="font-display text-sm font-semibold text-ink-950">Devise</h2>
            <p className="mt-1 text-xs text-gray-500">
              La devise utilisée pour tous tes montants, devis et factures.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <select
                value={selectedCurrency}
                onChange={(e) => setSelectedCurrency(e.target.value)}
                className="w-64 rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-ink-950 shadow-sm outline-none transition-colors focus:border-emerald-500"
              >
                <optgroup label="Afrique de l'Ouest et Centrale">
                  <option value="XOF">Franc CFA Ouest (XOF)</option>
                  <option value="XAF">Franc CFA Central (XAF)</option>
                  <option value="GHS">Cedi ghanéen (GHS)</option>
                  <option value="NGN">Naira nigérian (NGN)</option>
                  <option value="GNF">Franc guinéen (GNF)</option>
                </optgroup>
                <optgroup label="Maghreb">
                  <option value="MAD">Dirham marocain (MAD)</option>
                  <option value="DZD">Dinar algérien (DZD)</option>
                  <option value="TND">Dinar tunisien (TND)</option>
                </optgroup>
                <optgroup label="International">
                  <option value="EUR">Euro (EUR)</option>
                  <option value="CAD">Dollar canadien (CAD)</option>
                  <option value="USD">Dollar américain (USD)</option>
                  <option value="GBP">Livre sterling (GBP)</option>
                </optgroup>
              </select>
              <button
                onClick={() => updateCurrency.mutate()}
                disabled={updateCurrency.isPending}
                className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
              >
                {updateCurrency.isPending ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
              <p className="text-xs text-amber-700">
                Changer la devise n'affecte pas tes documents déjà créés : leurs montants
                restent affichés tels quels. Cette option sert à corriger la devise, pas à
                convertir des montants existants.
              </p>
            </div>
          </div>

          {/* ─── Logo de l'entreprise ─────────────────────────────────── */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-md shadow-gray-200/60">
            <h2 className="font-display text-sm font-semibold text-ink-950">Logo de l'entreprise</h2>
            <p className="mt-1 text-xs text-gray-500">
              PNG, JPG ou WEBP — 2 Mo maximum. Il apparaîtra sur vos devis et factures.
            </p>
            <div className="mt-4 flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                {currentLogo ? (
                  <img src={currentLogo} alt="Logo actuel" className="h-full w-full object-contain" />
                ) : (
                  <span className="text-xs text-gray-400">Aucun logo</span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleLogoSelect}
                  className="hidden"
                />
                <button
                  onClick={() => logoInputRef.current?.click()}
                  disabled={uploadLogo.isPending}
                  className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-50"
                >
                  {uploadLogo.isPending ? 'Envoi en cours...' : currentLogo ? 'Changer le logo' : 'Ajouter un logo'}
                </button>
                {currentLogo && (
                  <button
                    onClick={() => setConfirmTarget('logo')}
                    className="rounded-lg border border-coral-500/30 bg-white px-4 py-2 text-sm font-medium text-coral-500 shadow-sm transition-colors hover:bg-coral-500/10 disabled:opacity-50"
                  >
                    Supprimer
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ─── Signature de l'entreprise ────────────────────────────── */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-md shadow-gray-200/60">
            <h2 className="font-display text-sm font-semibold text-ink-950">Signature de l'entreprise</h2>
            <p className="mt-1 text-xs text-gray-500">
              PNG, JPG ou WEBP — 2 Mo maximum. Elle apparaîtra en bas de vos devis et factures. Astuce : une image
              avec fond transparent (PNG) rend le mieux.
            </p>
            <div className="mt-4 flex items-center gap-4">
              <div className="flex h-20 w-40 items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                {currentSignature ? (
                  <img src={currentSignature} alt="Signature actuelle" className="h-full w-full object-contain" />
                ) : (
                  <span className="text-xs text-gray-400">Aucune signature</span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={signatureInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleSignatureSelect}
                  className="hidden"
                />
                <button
                  onClick={() => signatureInputRef.current?.click()}
                  disabled={uploadSignature.isPending}
                  className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-50"
                >
                  {uploadSignature.isPending
                    ? 'Envoi en cours...'
                    : currentSignature
                      ? 'Changer la signature'
                      : 'Ajouter une signature'}
                </button>
                {currentSignature && (
                  <button
                    onClick={() => setConfirmTarget('signature')}
                    className="rounded-lg border border-coral-500/30 bg-white px-4 py-2 text-sm font-medium text-coral-500 shadow-sm transition-colors hover:bg-coral-500/10 disabled:opacity-50"
                  >
                    Supprimer
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ─── Choix du template PDF ────────────────────────────────── */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-md shadow-gray-200/60">
            <h2 className="font-display text-sm font-semibold text-ink-950">Modèle de document PDF</h2>
            <p className="mt-1 text-xs text-gray-500">
              Ce modèle sera utilisé pour tous vos devis et factures.
            </p>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {templates.map((tpl) => (
                <button
                  key={tpl.value}
                  onClick={() => setSelectedTemplate(tpl.value)}
                  className={`rounded-xl border-2 p-4 text-left transition-colors ${
                    selectedTemplate === tpl.value
                      ? 'border-emerald-500 bg-emerald-50/50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div
                    className={`mb-3 h-16 w-full rounded-md ${
                      tpl.value === 'MODERN' ? 'bg-gradient-to-br from-emerald-500 to-emerald-700' : 'bg-white border border-gray-800'
                    }`}
                  >
                    <div className={`h-2 w-full rounded-t-md ${tpl.value === 'MODERN' ? 'bg-emerald-400' : 'bg-black'}`} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-ink-950">{tpl.label}</span>
                    {selectedTemplate === tpl.value && (
                      <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-medium text-white">
                        Sélectionné
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">{tpl.description}</p>
                </button>
              ))}
            </div>
            <button
              onClick={() => updateTemplate.mutate()}
              disabled={updateTemplate.isPending}
              className="mt-4 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
            >
              {updateTemplate.isPending ? 'Enregistrement...' : 'Enregistrer le modèle'}
            </button>
          </div>
        </div>
      )}

      {confirmTarget && (
        <ConfirmDialog
          title={confirmTarget === 'logo' ? 'Supprimer le logo ?' : 'Supprimer la signature ?'}
          message={
            confirmTarget === 'logo'
              ? "Le logo ne s'affichera plus sur vos devis et factures. Vous pourrez en ajouter un nouveau à tout moment."
              : "La signature ne s'affichera plus sur vos devis et factures. Vous pourrez en ajouter une nouvelle à tout moment."
          }
          confirmLabel="Supprimer"
          variant="danger"
          isLoading={isDeleting}
          onConfirm={handleConfirmDelete}
          onCancel={() => setConfirmTarget(null)}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-fade-slide-up">
          <div
            className={`rounded-xl px-4 py-3 text-sm font-medium shadow-lg ${
              toast.type === 'success'
                ? 'bg-emerald-600 text-white'
                : 'bg-coral-500 text-white'
            }`}
          >
            {toast.message}
          </div>
        </div>
      )}
    </Layout>
  );
}