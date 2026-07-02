// src/lib/format.ts

export function formatMoney(cents: number, currency: string) {
  const amount = cents / 100;
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'XOF' ? 0 : 2,
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

// Télécharge un PDF depuis l'API (le token est injecté automatiquement par
// l'intercepteur axios) et déclenche le téléchargement dans le navigateur
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

// Construit un lien wa.me pour envoyer un message WhatsApp pré-rempli.
// Limite connue : WhatsApp ne permet pas de joindre un fichier via ce lien —
// le commerçant doit télécharger le PDF puis l'attacher manuellement s'il
// veut l'envoyer avec le message.
export function buildWhatsAppLink(phone: string, message: string): string {
  // Garde uniquement les chiffres (wa.me exige le numéro sans espaces, tirets ni "+")
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
