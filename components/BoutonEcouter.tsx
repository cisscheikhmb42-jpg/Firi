"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

const pasDeSouscription = () => () => {};

type Props = {
  texteFrancais: string;
  // Emplacement prévu pour un futur audio wolof (fichier ou synthèse vocale).
  audioWolofUrl?: string;
};

export default function BoutonEcouter({ texteFrancais, audioWolofUrl }: Props) {
  const [enLecture, setEnLecture] = useState(false);
  // La lecture vocale n'existe que dans le navigateur (false côté serveur).
  const disponible = useSyncExternalStore(
    pasDeSouscription,
    () => "speechSynthesis" in window,
    () => false,
  );

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  function lireFrancais() {
    const synth = window.speechSynthesis;
    if (enLecture) {
      synth.cancel();
      setEnLecture(false);
      return;
    }
    synth.cancel();
    const phrase = new SpeechSynthesisUtterance(texteFrancais);
    phrase.lang = "fr-FR";
    phrase.rate = 0.9;
    const voix = synth.getVoices().find((v) => v.lang.toLowerCase().startsWith("fr"));
    if (voix) phrase.voice = voix;
    phrase.onend = () => setEnLecture(false);
    phrase.onerror = () => setEnLecture(false);
    setEnLecture(true);
    synth.speak(phrase);
  }

  if (audioWolofUrl) {
    // TODO : quand l'audio wolof sera prêt, le lire ici en priorité.
    return <audio controls src={audioWolofUrl} className="w-full" />;
  }

  if (!disponible || !texteFrancais) return null;

  return (
    <button
      type="button"
      onClick={lireFrancais}
      aria-pressed={enLecture}
      className="mt-4 flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl bg-amber-100 px-4 text-xl font-bold text-amber-900 active:bg-amber-200"
    >
      <span aria-hidden="true" className="text-2xl">{enLecture ? "⏹️" : "🔊"}</span>
      {enLecture ? "Arrêter" : "Écouter"}
    </button>
  );
}
