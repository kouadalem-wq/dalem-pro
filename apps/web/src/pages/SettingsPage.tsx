// src/pages/SettingsPage.tsx
import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Layout } from '../components/Layout';
import { getErrorMessage } from '../lib/errors';

type Tenant = {
  id: string;
  name: string;
  logo: string | null;
  signature: string | null;
  pdfTemplate: 'MODERN' | 'CLASSIC';
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
  const logoInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<'MODERN' | 'CLASSIC'>('MODERN');

  const { data, isLoading } = useQuery<{ data: Tenant }>({
    queryKey: ['tenant-me'],
    queryFn: async () => (await api.get('/tenants/me')).data,
  });

  useEffect(() => {
    if (data?.data) {
      setSelectedTemplate(data.data.pdfTemplate);
    }
  }, [data]);

  const updateTemplate = useMutation({
    mutationFn: async () => (await api.patch('/tenants/me', { pdfTemplate: selectedTemplate })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-me'] });
    },
  });

  // Upload du logo : envoie le fichier en multipart/form-data
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
    },
  });

  // Upload de la signature : meme principe que le logo
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

  const currentLogo = data?.data?.logo;
  const currentSignature = data?.data?.signature;

  return (
    <Layout title="Paramètres" subtitle="Personnalisez l'apparence de vos documents">
      {isLoading ? (
        <p className="text-sm text-gray-400">Chargement...</p>
      ) : (
        <div className="max-w-2xl space-y-6">
          {(updateTemplate.isError || uploadLogo.isError || uploadSignature.isError) && (
            <div className="rounded-lg bg-coral-500/10 px-3 py-2.5 text-sm text-coral-500">
              {getErrorMessage(updateTemplate.error ?? uploadLogo.error ?? uploadSignature.error)}
            </div>
          )}
          {updateTemplate.isSuccess && (
            <div className="rounded-lg bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">
              Modèle enregistré avec succès.
            </div>
          )}
          {uploadLogo.isSuccess && (
            <div className="rounded-lg bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">
              Logo mis à jour avec succès.
            </div>
          )}
          {uploadSignature.isSuccess && (
            <div className="rounded-lg bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">
              Signature mise à jour avec succès.
            </div>
          )}

          {/* ─── Logo de l'entreprise ─────────────────────────────── */}
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

              <div>
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
              </div>
            </div>
          </div>

          {/* ─── Signature de l'entreprise ────────────────────────── */}
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

              <div>
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
              </div>
            </div>
          </div>

          {/* ─── Choix du template PDF ───────────────────────────── */}
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
    </Layout>
  );
}
