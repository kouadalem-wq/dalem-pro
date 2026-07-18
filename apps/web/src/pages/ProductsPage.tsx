// src/pages/ProductsPage.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Layout } from '../components/Layout';
import { BarcodeScanner } from '../components/BarcodeScanner';
import { formatMoney } from '../lib/format';
import { getErrorMessage } from '../lib/errors';
import { useAuth } from '../context/AuthContext';

type Product = {
  id: string;
  name: string;
  description: string | null;
  type: 'PRODUCT' | 'SERVICE';
  unitPrice: number; // en centimes
  stockQuantity: number;
  unit: string;
  barcode: string | null;
};

const emptyForm = {
  name: '',
  description: '',
  type: 'PRODUCT' as 'PRODUCT' | 'SERVICE',
  unitPrice: 0, // saisi en unité principale (ex: 500), converti en centimes à l'envoi
  stockQuantity: 0,
  unit: 'unité',
  barcode: '',
};

export function ProductsPage() {
  const { tenant } = useAuth();
  const currency = tenant?.currency ?? 'XOF';
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  // Ouverture de la fenetre de scan camera
  const [scanning, setScanning] = useState(false);

  // Ajustement de stock inline
  const [adjustingId, setAdjustingId] = useState<string | null>(null);
  const [stockDelta, setStockDelta] = useState(0);

  const { data, isLoading } = useQuery<{ data: Product[] }>({
    queryKey: ['products'],
    queryFn: async () => (await api.get('/products')).data,
  });

  const createProduct = useMutation({
    mutationFn: async () =>
      (
        await api.post('/products', {
          ...form,
          unitPrice: Math.round(form.unitPrice * 100),
          // On n'envoie pas un code-barres vide (null plutot que "")
          barcode: form.barcode.trim() || undefined,
        })
      ).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setForm(emptyForm);
      setShowForm(false);
    },
  });

  const adjustStock = useMutation({
    mutationFn: async ({ id, delta }: { id: string; delta: number }) =>
      (await api.patch(`/products/${id}/stock`, { delta })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setAdjustingId(null);
      setStockDelta(0);
    },
  });

  const products = data?.data ?? [];

  return (
    <Layout
      title="Produits"
      subtitle={`${products.length} produit${products.length > 1 ? 's' : ''} au catalogue`}
      action={
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-lg bg-ink-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-600"
        >
          {showForm ? 'Annuler' : '+ Nouveau produit'}
        </button>
      }
    >
      {showForm && (
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-md shadow-gray-200/60">
          {createProduct.isError && (
            <div className="mb-4 rounded-lg bg-coral-500/10 px-3 py-2.5 text-sm text-coral-500">
              {getErrorMessage(createProduct.error)}
            </div>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-gray-600">Nom *</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1.5 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                placeholder="Pain complet"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as 'PRODUCT' | 'SERVICE' })}
                className="mt-1.5 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="PRODUCT">Produit (avec stock)</option>
                <option value="SERVICE">Service (sans stock)</option>
              </select>
            </div>
          </div>
          <div className="mt-3">
            <label className="text-xs font-medium text-gray-600">Description (facultatif)</label>
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="mt-1.5 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          {/* Code-barres : saisie manuelle, douchette (tape + Entree), ou scan camera */}
          <div className="mt-3">
            <label className="text-xs font-medium text-gray-600">Code-barres (facultatif)</label>
            <div className="mt-1.5 flex gap-2">
              <input
                value={form.barcode}
                onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                onKeyDown={(e) => {
                  // Une douchette USB finit par un "Entree" : on l'empeche de
                  // soumettre quoi que ce soit, le code reste juste dans le champ.
                  if (e.key === 'Enter') e.preventDefault();
                }}
                className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                placeholder="Scanne ou saisis le code"
              />
              <button
                type="button"
                onClick={() => setScanning(true)}
                className="flex shrink-0 items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-100"
                title="Scanner avec la caméra"
              >
                <span aria-hidden>📷</span> Scanner
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-400">
              Utilise la caméra, une douchette USB, ou saisis le code à la main.
            </p>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="text-xs font-medium text-gray-600">Prix unitaire ({currency}) *</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.unitPrice}
                onChange={(e) => setForm({ ...form, unitPrice: Number(e.target.value) })}
                className="mt-1.5 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            {form.type === 'PRODUCT' && (
              <div>
                <label className="text-xs font-medium text-gray-600">Stock initial</label>
                <input
                  type="number"
                  min={0}
                  value={form.stockQuantity}
                  onChange={(e) => setForm({ ...form, stockQuantity: Number(e.target.value) })}
                  className="mt-1.5 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-gray-600">Unité</label>
              <input
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                className="mt-1.5 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                placeholder="unité, kg, heure..."
              />
            </div>
          </div>
          <button
            onClick={() => createProduct.mutate()}
            disabled={createProduct.isPending || !form.name}
            className="mt-5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
          >
            {createProduct.isPending ? 'Création...' : 'Créer le produit'}
          </button>
        </div>
      )}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-md shadow-gray-200/60">
        {isLoading ? (
          <p className="px-5 py-8 text-center text-sm text-gray-400">Chargement...</p>
        ) : products.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-400">Aucun produit pour le moment.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
                <th className="px-5 py-3 font-medium">Nom</th>
                <th className="px-5 py-3 font-medium">Code-barres</th>
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium">Prix</th>
                <th className="px-5 py-3 font-medium">Stock</th>
                <th className="px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-t border-gray-50">
                  <td className="px-5 py-3.5 font-medium text-ink-950">{product.name}</td>
                  <td className="px-5 py-3.5 text-gray-500">
                    {product.barcode ? (
                      <span className="font-mono text-xs">{product.barcode}</span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-gray-600">
                    {product.type === 'PRODUCT' ? 'Produit' : 'Service'}
                  </td>
                  <td className="px-5 py-3.5 text-gray-900">{formatMoney(product.unitPrice, currency)}</td>
                  <td className="px-5 py-3.5 text-gray-600">
                    {product.type === 'SERVICE' ? (
                      '—'
                    ) : (
                      <span className={product.stockQuantity === 0 ? 'text-coral-500 font-medium' : ''}>
                        {product.stockQuantity} {product.unit}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    {product.type === 'PRODUCT' && (
                      adjustingId === product.id ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            autoFocus
                            value={stockDelta || ''}
                            onChange={(e) => setStockDelta(Number(e.target.value))}
                            placeholder="+10 ou -3"
                            className="w-24 rounded-md border border-gray-200 px-2 py-1 text-xs outline-none focus:border-emerald-500"
                          />
                          <button
                            onClick={() => adjustStock.mutate({ id: product.id, delta: stockDelta })}
                            disabled={adjustStock.isPending || stockDelta === 0}
                            className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => setAdjustingId(null)}
                            className="text-xs text-gray-400 hover:text-gray-600"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setAdjustingId(product.id)}
                          className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
                        >
                          Ajuster le stock
                        </button>
                      )
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Fenetre de scan camera */}
      {scanning && (
        <BarcodeScanner
          onDetected={(code) => {
            setForm((f) => ({ ...f, barcode: code }));
            setScanning(false);
          }}
          onClose={() => setScanning(false)}
        />
      )}
    </Layout>
  );
}