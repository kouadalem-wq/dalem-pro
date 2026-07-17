// src/lib/format.ts

// Devises sans centimes a l'affichage (0 decimale) : francs CFA et franc guineen.
// Le stockage reste toujours en centimes (x100) quelle que soit la devise ;
// seul l'affichage s'adapte.
const DEVISES_SANS_DECIMALE = ['XOF', 'XAF', 'GNF'];

export function formatMoney(cents: number, currency: string) {
  const amount = cents / 100;
  const decimales = DEVISES_SANS_DECIMALE.includes(currency) ? 0 : 2;

  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(amount);
}

export function formatDate(dateString: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(dateString));
}

export const statusStyles: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  SENT: 'bg-blue-50 text-blue-600',
  PARTIAL: 'bg-amber-50 text-amber-600',
  PAID: 'bg-emerald-50 text-emerald-700',
  OVERDUE: 'bg-coral-500/10 text-coral-500',
  CANCELLED: 'bg-gray-100 text-gray-400',
  ACCEPTED: 'bg-emerald-50 text-emerald-700',
  REJECTED: 'bg-coral-500/10 text-coral-500',
  EXPIRED: 'bg-gray-100 text-gray-400',
};

export const statusLabels: Record<string, string> = {
  DRAFT: 'Brouillon',
  SENT: 'Envoyée',
  PARTIAL: 'Partielle',
  PAID: 'Payée',
  OVERDUE: 'En retard',
  CANCELLED: 'Annulée',
  ACCEPTED: 'Accepté',
  REJECTED: 'Refusé',
  EXPIRED: 'Expiré',
};

// Telecharge un PDF depuis l'API (le token est injecte automatiquement par
// l'intercepteur axios) et declenche le telechargement dans le navigateur
export async function downloadPdf(api: any, url: string, filename: string) {
  const response = await api.get(url, { responseType: 'blob' });
  const blobUrl = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);
}

// Construit un lien wa.me pour envoyer un message WhatsApp pre-rempli.
// Limite connue : WhatsApp ne permet pas de joindre un fichier via ce lien —
// le commercant doit telecharger le PDF puis l'attacher manuellement s'il
// veut l'envoyer avec le message.
export function buildWhatsAppLink(phone: string, message: string): string {
  // Garde uniquement les chiffres (wa.me exige le numero sans espaces, tirets ni "+")
  const digitsOnly = phone.replace(/\D/g, '');
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${digitsOnly}?text=${encodedMessage}`;
}

export function buildInvoiceWhatsAppMessage(params: {
  tenantName: string;
  clientName: string;
  documentType: 'devis' | 'facture';
  number: string;
  amount: string;
}): string {
  return `Bonjour ${params.clientName},\n\nVoici votre ${params.documentType} ${params.number} de la part de ${params.tenantName}, d'un montant de ${params.amount}.\n\nMerci de nous confirmer bonne réception.`;
}