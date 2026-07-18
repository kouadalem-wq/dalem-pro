// src/components/Lifeline.tsx
// « Ligne de vie » : combien de temps l'entreprise peut-elle tenir ?
//
// Parti pris : zéro jargon comptable. Une jauge (comme un réservoir d'essence),
// une liste de ce qui arrive, et une courbe fine de l'activité passée.
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { formatMoney } from '../lib/format';
import { useAuth } from '../context/AuthContext';

type Evenement = {
  jour: number;
  montant: number;
  libelle: string;
  reference: string | null;
  enRetard: boolean;
};

type LifelineData = {
  soldeActuel: number;
  rythmeQuotidien: number;
  revenuQuotidien: number;
  fluxNetQuotidien: number;
  joursAutonomie: number | null; // null = aucune rupture prevue (tresorerie saine)
  dateRupture: string | null;
  horizon: number;
  aEncaisser: number;
  nbFacturesDues: number;
  prochainsEvenements: Evenement[];
  courbe: number[];
  evolution: { label: string; encaisse: number; depense: number }[];
};

const dateLongue = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

// Formate un nombre de jours en langage clair : jours, ou mois/annees si c'est long.
function dureeLisible(jours: number): string {
  if (jours < 60) return `${jours} jour${jours > 1 ? 's' : ''}`;
  if (jours < 365) {
    const mois = Math.round(jours / 30);
    return `environ ${mois} mois`;
  }
  const annees = Math.floor(jours / 365);
  const moisRestants = Math.round((jours % 365) / 30);
  if (moisRestants === 0) return `plus de ${annees} an${annees > 1 ? 's' : ''}`;
  return `environ ${annees} an${annees > 1 ? 's' : ''} et ${moisRestants} mois`;
}

export function Lifeline() {
  const { tenant } = useAuth();
  const currency = tenant?.currency ?? 'XOF';
  const { data, isLoading, isError } = useQuery<{ data: LifelineData }>({
    queryKey: ['dashboard-lifeline'],
    queryFn: async () => (await api.get('/dashboard/lifeline')).data,
  });

  if (isLoading) {
    return <div className="mb-6 h-56 animate-pulse rounded-2xl bg-white/60" aria-busy="true" />;
  }
  if (isError || !data?.data) {
    return null; // discret : on ne casse pas le reste du tableau de bord
  }

  const d = data.data;
  const enDanger = d.joursAutonomie !== null;

  // Remplissage de la jauge. Si une rupture est prevue, on la situe sur une
  // echelle de 90 jours (au-dela, la jauge est pleine mais le texte donne le vrai chiffre).
  const remplissage = enDanger
    ? Math.min(100, Math.max(4, Math.round((d.joursAutonomie! / 90) * 100)))
    : 100;

  const couleurJauge = !enDanger
    ? 'bg-emerald-500'
    : d.joursAutonomie! < 15
      ? 'bg-coral-500'
      : d.joursAutonomie! < 45
        ? 'bg-amber-500'
        : 'bg-emerald-500';

  return (
    <div className="mb-6 space-y-4">
      {/* ─── LA JAUGE ─── */}
      <section className="animate-fade-slide-up rounded-2xl border border-gray-200 bg-white p-6 shadow-md shadow-gray-200/60">
        <p className="text-sm text-gray-500">
          Avec l'argent que tu as et ce que tes clients doivent te payer, tu peux tenir :
        </p>
        {!enDanger ? (
          <p className="mt-3 font-display text-3xl font-semibold text-emerald-600">
            Trésorerie saine — aucune rupture prévue
          </p>
        ) : d.joursAutonomie! > 365 ? (
          // Autonomie tres longue : un chiffre exact serait faussement precis.
          // On rassure plutot que de compter les jours a 6 ans d'echeance.
          <p className="mt-3 font-display text-3xl font-semibold text-emerald-600">
            Trésorerie confortable
          </p>
        ) : (
          // Moins d'un an : le nombre de jours est utile et actionnable.
          <>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-display text-5xl font-semibold text-ink-950">
                {d.joursAutonomie}
              </span>
              <span className="text-xl text-gray-500">
                {d.joursAutonomie! > 1 ? 'jours' : 'jour'}
              </span>
            </div>
            {d.joursAutonomie! >= 60 && (
              <p className="mt-1 text-sm text-gray-400">Soit {dureeLisible(d.joursAutonomie!)}.</p>
            )}
          </>
        )}

        {/* Le réservoir */}
        <div className="mt-5 h-6 overflow-hidden rounded-lg bg-gray-100">
          <div
            className={`h-full rounded-lg transition-all duration-700 ${couleurJauge}`}
            style={{ width: `${remplissage}%` }}
            role="img"
            aria-label={
              enDanger
                ? `Autonomie de ${d.joursAutonomie} jours`
                : 'Trésorerie saine, aucune rupture prévue'
            }
          />
        </div>
        <div className="mt-2 flex justify-between text-xs text-gray-400">
          <span>Aujourd'hui</span>
          <span>
            {enDanger && d.joursAutonomie! <= 365 && d.dateRupture
              ? `${dateLongue(d.dateRupture)} — réservoir vide`
              : 'Aucun manque prévu'}
          </span>
        </div>

        {/* Message de contexte : l'entreprise gagne ou perd de l'argent au quotidien ? */}
        {d.fluxNetQuotidien >= 0 ? (
          <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2.5 text-xs text-emerald-700">
            À ton rythme actuel, tu encaisses plus que tu ne dépenses. Ta trésorerie se renforce
            avec le temps.
          </p>
        ) : (
          <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2.5 text-xs text-amber-700">
            À ton rythme actuel, tu dépenses un peu plus que tu n'encaisses. Surveille tes
            rentrées d'argent pour rester serein.
          </p>
        )}
      </section>

      {/* ─── LES DEUX CHIFFRES ─── */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div
          className="animate-fade-slide-up rounded-2xl border border-gray-200 border-l-4 border-l-emerald-500 bg-white p-5 shadow-md shadow-gray-200/60"
          style={{ animationDelay: '100ms' }}
        >
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
            Ce que tes clients te doivent
          </p>
          <p className="mt-2 font-display text-2xl font-semibold text-emerald-600">
            {formatMoney(d.aEncaisser, currency)}
          </p>
          <p className="mt-1 text-xs text-gray-400">
            {d.nbFacturesDues} facture{d.nbFacturesDues > 1 ? 's' : ''} en attente
          </p>
        </div>
        <div
          className="animate-fade-slide-up rounded-2xl border border-gray-200 border-l-4 border-l-gray-200 bg-white p-5 shadow-md shadow-gray-200/60"
          style={{ animationDelay: '200ms' }}
        >
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
            Tes dépenses, en moyenne
          </p>
          <p className="mt-2 font-display text-2xl font-semibold text-ink-950">
            {formatMoney(d.rythmeQuotidien * 30, currency)}
            <span className="ml-1 text-sm font-normal text-gray-400">/ mois</span>
          </p>
          <p className="mt-1 text-xs text-gray-400">Calculé sur tes 3 derniers mois</p>
        </div>
      </div>

      {/* ─── CE QUI ARRIVE ─── */}
      {d.prochainsEvenements.length > 0 && (
        <section
          className="animate-fade-slide-up rounded-2xl border border-gray-200 bg-white shadow-md shadow-gray-200/60"
          style={{ animationDelay: '300ms' }}
        >
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="font-display text-sm font-semibold text-ink-950">
              Ce qui arrive dans les prochaines semaines
            </h2>
          </div>
          <ul className="divide-y divide-gray-50">
            {d.prochainsEvenements.map((e, i) => (
              <li key={i} className="flex items-center gap-3 px-5 py-3.5">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                    e.enRetard ? 'bg-coral-50' : 'bg-emerald-50'
                  }`}
                  aria-hidden
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={e.enRetard ? '#993c1d' : '#0f6e56'}
                    strokeWidth="2"
                  >
                    <path d="M12 5v14M5 12l7 7 7-7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-ink-950">{e.libelle}</p>
                  <p className="text-xs text-gray-400">
                    {e.enRetard
                      ? 'En retard — à relancer'
                      : e.jour === 0
                        ? "Aujourd'hui"
                        : `Dans ${e.jour} jour${e.jour > 1 ? 's' : ''}`}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold text-emerald-600">
                  +{formatMoney(e.montant, currency)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ─── L'ÉVOLUTION ─── */}
      <section
        className="animate-fade-slide-up rounded-2xl border border-gray-200 bg-white p-6 shadow-md shadow-gray-200/60"
        style={{ animationDelay: '400ms' }}
      >
        <h2 className="font-display text-sm font-semibold text-ink-950">
          Ton activité mois par mois
        </h2>
        <p className="mt-1 text-xs text-gray-400">
          La courbe verte, c'est l'argent qui est entré. La grise, ce que tu as dépensé.
        </p>
        <CourbeEvolution data={d.evolution} />
      </section>
    </div>
  );
}

// ─── Courbe fine et lissée, en SVG pur (aucune librairie) ───
function CourbeEvolution({
  data,
}: {
  data: { label: string; encaisse: number; depense: number }[];
}) {
  const W = 640;
  const H = 200;
  const PAD = { top: 16, right: 12, bottom: 28, left: 56 };

  if (data.length < 2) {
    return <p className="mt-6 text-center text-sm text-gray-400">Pas encore assez de données.</p>;
  }

  const max = Math.max(1, ...data.map((d) => Math.max(d.encaisse, d.depense)));
  const x = (i: number) =>
    PAD.left + (i * (W - PAD.left - PAD.right)) / (data.length - 1);
  const y = (v: number) => PAD.top + (1 - v / max) * (H - PAD.top - PAD.bottom);

  const chemin = (cle: 'encaisse' | 'depense') => {
    const pts = data.map((d, i) => [x(i), y(d[cle])] as const);
    let p = `M ${pts[0][0]} ${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const [x1, y1] = pts[i];
      const [x2, y2] = pts[i + 1];
      const cx = (x1 + x2) / 2;
      p += ` C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`;
    }
    return p;
  };

  const aire = () => {
    const base = H - PAD.bottom;
    return `${chemin('encaisse')} L ${x(data.length - 1)} ${base} L ${x(0)} ${base} Z`;
  };

  const paliers = [0, 0.33, 0.66, 1].map((f) => f * max);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="mt-4 w-full"
      role="img"
      aria-label="Courbe de l'argent encaissé et dépensé sur les six derniers mois"
    >
      <defs>
        <linearGradient id="dp-lifeline-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
        </linearGradient>
      </defs>
      {paliers.map((v, i) => (
        <g key={i}>
          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={y(v)}
            y2={y(v)}
            stroke="#e5e7eb"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
          <text x={PAD.left - 10} y={y(v) + 4} textAnchor="end" fontSize="11" fill="#9ca3af">
            {Math.round(v / 100 / 1000).toLocaleString('fr-FR')}k
          </text>
        </g>
      ))}
      <path d={aire()} fill="url(#dp-lifeline-fill)" />
      <path
        d={chemin('depense')}
        fill="none"
        stroke="#cbd5e1"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={chemin('encaisse')}
        fill="none"
        stroke="#0d9165"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {data.map((d, i) => (
        <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="#9ca3af">
          {d.label}
        </text>
      ))}
    </svg>
  );
}