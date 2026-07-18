// src/components/BarcodeScanner.tsx
// Fenetre modale de scan de code-barres via la camera.
// Utilise @zxing/library, specialise dans les codes-barres 1D
// (EAN-13, UPC, Code128...) — bien plus fiable que html5-qrcode pour le 1D.
//
// Note materielle : la lecture 1D par WEBCAM d'ordinateur reste difficile
// (pas d'autofocus, faible resolution rapprochee). Sur TELEPHONE (autofocus)
// ou avec une DOUCHETTE USB, c'est bien plus fiable. Ce composant fait au mieux.
//
// Contrainte navigateur : l'acces camera exige un contexte securise
// (HTTPS ou localhost). En prod (Vercel HTTPS) et en local, c'est OK.
import { useEffect, useRef, useState } from 'react';
import {
  BrowserMultiFormatReader,
  DecodeHintType,
  BarcodeFormat,
} from '@zxing/library';

type Props = {
  onDetected: (code: string) => void;
  onClose: () => void;
};

// Formats lineaires les plus repandus sur les produits.
const FORMATS_1D = [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
];

export function BarcodeScanner({ onDetected, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const [error, setError] = useState<string | null>(null);
  const doneRef = useRef(false);

  useEffect(() => {
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, FORMATS_1D);

    const reader = new BrowserMultiFormatReader(hints);
    readerRef.current = reader;
    let cancelled = false;

    reader
      .decodeFromConstraints(
        { video: { facingMode: 'environment' } },
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
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-900">
              <video ref={videoRef} className="h-56 w-full object-cover" />
            </div>
            <p className="mt-3 text-center text-xs text-gray-400">
              Place le code-barres bien à plat dans le cadre, avec une bonne lumière.
            </p>
            {/* Aide : orienter l'utilisateur vers le canal le plus fiable selon son appareil */}
            <div className="mt-3 rounded-lg bg-gray-50 px-3 py-2.5">
              <p className="text-xs text-gray-500">
                <span className="font-medium text-gray-600">Astuce :</span> sur ordinateur, une
                douchette USB (ou la saisie manuelle) est plus fiable qu'une webcam. Sur téléphone,
                la caméra fonctionne bien.
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