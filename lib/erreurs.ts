// Traduit une erreur de l'IA en un petit code lisible, affiché discrètement
// sous le message d'erreur. Aide à comprendre ce qui bloque sans ouvrir les logs.
// Aucun secret (clé, contenu du document) n'est renvoyé.

export type CodeErreurIA =
  | "cle_invalide"
  | "acces_refuse"
  | "modele_indisponible"
  | "quota_depasse"
  | "ia_surchargee"
  | "reponse_invalide"
  | "inconnue";

export function codeErreurIA(e: unknown): CodeErreurIA {
  const message = e instanceof Error ? e.message : String(e);
  const status = typeof (e as { status?: unknown })?.status === "number" ? (e as { status: number }).status : 0;

  if (/api[_ ]key|API_KEY_INVALID|invalid x-api-key|authentication/i.test(message) || status === 401) {
    return "cle_invalide";
  }
  if (status === 404 || /not found|no longer available|not supported|does not exist|deprecated/i.test(message)) {
    return "modele_indisponible";
  }
  if (status === 429 || /quota|rate limit|RESOURCE_EXHAUSTED/i.test(message)) return "quota_depasse";
  if (status === 403 || /permission|PERMISSION_DENIED|location is not supported/i.test(message)) {
    return "acces_refuse";
  }
  if (status >= 500 || /overloaded|UNAVAILABLE/i.test(message)) return "ia_surchargee";
  if (e instanceof SyntaxError) return "reponse_invalide";
  return "inconnue";
}
