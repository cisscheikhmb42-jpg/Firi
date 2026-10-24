// Lecture à voix haute des réponses de Firi.

// ─────────────────────────────────────────────────────────────────────────
// EMPLACEMENT VOIX WOLOF — à brancher plus tard.
//
// Quand tu auras une vraie voix wolof (API de synthèse vocale wolof,
// fichiers audio enregistrés…), c'est ICI qu'il faut la brancher :
// renvoie l'adresse d'un fichier audio (URL ou "data:audio/...") pour le
// texte wolof donné. Tant que cette fonction renvoie null, Firi lit le
// texte français avec la voix du téléphone.
//
// Exemple futur :
//   const r = await fetch("/api/voix-wolof", { method: "POST", body: JSON.stringify({ texte }) });
//   return r.ok ? URL.createObjectURL(await r.blob()) : null;
// ─────────────────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function obtenirAudioWolof(texteWolof: string): Promise<string | null> {
  return null;
}

// Voix française du téléphone (speechSynthesis). Renvoie une fonction "stop".
export function lireEnFrancais(texte: string, quandFini: () => void): () => void {
  const synth = window.speechSynthesis;
  synth.cancel();
  const phrase = new SpeechSynthesisUtterance(texte);
  phrase.lang = "fr-FR";
  phrase.rate = 0.9;
  const voix = synth.getVoices().find((v) => v.lang.toLowerCase().startsWith("fr"));
  if (voix) phrase.voice = voix;
  phrase.onend = quandFini;
  phrase.onerror = quandFini;
  synth.speak(phrase);
  return () => synth.cancel();
}

// Lit un fichier audio (pour la future voix wolof). Renvoie une fonction "stop".
export function lireAudio(url: string, quandFini: () => void): () => void {
  const audio = new Audio(url);
  audio.onended = quandFini;
  audio.onerror = quandFini;
  audio.play().catch(quandFini);
  return () => {
    audio.pause();
    quandFini();
  };
}
