"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { lireAudio, lireEnFrancais, obtenirAudioWolof } from "@/lib/voix";

const pasDeSouscription = () => () => {};

type Props = {
  texteFrancais: string;
  // Utilisé dès qu'une voix wolof sera branchée dans lib/voix.ts.
  texteWolof?: string;
  compact?: boolean;
};

export default function BoutonEcouter({ texteFrancais, texteWolof, compact = false }: Props) {
  const [enLecture, setEnLecture] = useState(false);
  const stop = useRef<(() => void) | null>(null);
  // La lecture vocale n'existe que dans le navigateur (false côté serveur).
  const disponible = useSyncExternalStore(
    pasDeSouscription,
    () => "speechSynthesis" in window,
    () => false,
  );

  useEffect(() => () => stop.current?.(), []);

  async function basculer() {
    if (enLecture) {
      stop.current?.();
      setEnLecture(false);
      return;
    }
    setEnLecture(true);
    const fini = () => setEnLecture(false);
    const audioWolof = texteWolof ? await obtenirAudioWolof(texteWolof) : null;
    stop.current = audioWolof ? lireAudio(audioWolof, fini) : lireEnFrancais(texteFrancais, fini);
  }

  if (!disponible || !texteFrancais) return null;

  return (
    <button
      type="button"
      onClick={basculer}
      aria-pressed={enLecture}
      className={
        compact
          ? "mt-3 flex min-h-12 items-center gap-2 rounded-xl bg-amber-100 px-4 text-lg font-bold text-amber-900 active:bg-amber-200"
          : "mt-4 flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl bg-amber-100 px-4 text-xl font-bold text-amber-900 active:bg-amber-200"
      }
    >
      <span aria-hidden="true" className={compact ? "text-xl" : "text-2xl"}>{enLecture ? "⏹️" : "🔊"}</span>
      {enLecture ? "Arrêter" : "Écouter"}
    </button>
  );
}
