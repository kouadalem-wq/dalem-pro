// src/components/BarcodeScanner.tsx
// Fenetre modale de scan de code-barres via la camera.
// Utilise @zxing/library. On laisse ZXing accepter TOUS les formats qu'il
// connait (pas de restriction) : restreindre risquait d'exclure le format
// exact des codes scannes. Mieux vaut tout accepter, quitte a etre moins cible.
//
// Contrainte navigateur : l'acces camera exige un contexte securise
// (HTTPS ou localhost). En prod (Vercel HTTPS) et en local, c'est OK.
import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, DecodeHintType } from '@zxing/library';

type Props = {
  onDetected: (code: string) => void;
  onClose: () => void;
};

export function BarcodeScanner({ onDetected, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastAttempt, setLastAttempt] = useState<string>('');
  const doneRef = useRef(false);

  useEffect(() => {
    // TRY_HARDER en temps reel est acceptable ici : on veut maximiser les
    // chances de lecture, quitte a analyser un peu moins d'images par seconde.
    const hints = new Map();
    hints.set(DecodeHintType.TRY_HARDER, true);

    const reader = new BrowserMultiFormatReader(hints);
    readerRef.current = reader;
    let cancelled = false;

    reader
      .decodeFromConstraints(
        {
          video: {
            facingMode: 'environment',
            // On demande une resolution elevee : plus de pixels sur le code = meilleure lecture
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        },
        videoRef.current!,
        (result) => {
          if (cancelled || doneRef.current) return;
          if (result) {
            doneRef.current = true;
            const code = result.getText();
            stopSafely();
            onDetected(code);
          }
        },
      )
      .catch((e) => {
        if (cancelled) return;
        setError(
          "Impossible d'ouvrir la caméra. Vérifie que tu as autorisé son accès, " +
            'et que tu es en HTTPS ou sur localhost.',
        );
        // eslint-disable-next-line no-console
        console.error('Erreur camera:', e);
      });

    function stopSafely() {
      try {
        readerRef.current?.reset();
      } catch {
        // on avale toute erreur d'arret
      }
    }

    return () => {
      cancelled = true;
      stopSafely();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-sm font-semibold text-ink-950">Scanner un code-barres</h3>
          <button
            onClick={onClose}
            className="text-gray-400 transition-colors hover:text-gray-600"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>

        {error ? (
          <div className="rounded-lg bg-coral-500/10 px-3 py-3 text-sm text-coral-500">{error}</div>
        ) : (
          <>
            <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-gray-900">
              <video ref={videoRef} className="h-64 w-full object-cover" />
              {/* Ligne de visee : aide a centrer le code-barres */}
              <div className="pointer-events-none absolute inset-x-6 top-1/2 h-0.5 -translate-y-1/2 bg-coral-500/70" />
            </div>
            <p className="mt-3 text-center text-xs text-gray-400">
              Centre le code-barres sur la ligne rouge, bien à plat et net.
            </p>
            <div className="mt-3 rounded-lg bg-gray-50 px-3 py-2.5">
              <p className="text-xs text-gray-500">
                <span className="font-medium text-gray-600">Astuce :</span> approche puis éloigne
                lentement le code jusqu'à la détection. Une douchette USB reste la plus fiable sur ordinateur.
              </p>
            </div>
          </>
        )}

        <button
          onClick={onClose}
          className="mt-4 w-full rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
        >
          Fermer
        </button>
      </div>
    </div>
  );
}