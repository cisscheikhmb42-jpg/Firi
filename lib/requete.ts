// Envoie une requête JSON à nos routes serveur et renvoie la réponse.
// Si Vercel renvoie sa propre page d'erreur (texte, pas JSON), on en tire
// un message simple et un code (ex : FUNCTION_INVOCATION_TIMEOUT).

export class ErreurFiri extends Error {
  constructor(
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}

export async function posterJson<T>(url: string, corps: unknown): Promise<T> {
  let reponse: Response;
  try {
    reponse = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corps),
    });
  } catch {
    throw new ErreurFiri("Pas de connexion internet. Vérifie ta connexion et réessaie.", "hors_ligne");
  }

  const texte = await reponse.text();
  let donnees: { erreur?: string; code?: string } | null = null;
  try {
    donnees = JSON.parse(texte);
  } catch {
    // Page d'erreur de Vercel : on cherche le code en majuscules.
    const codeVercel = texte.match(/\b[A-Z][A-Z_]{5,}\b/)?.[0];
    const message =
      reponse.status === 504 || codeVercel?.includes("TIMEOUT")
        ? "Firi a mis trop de temps à répondre. Réessaie."
        : reponse.status === 413 || codeVercel?.includes("TOO_LARGE")
          ? "La photo ou le message est trop lourd. Réessaie."
          : "Firi a eu un problème. Réessaie dans un instant.";
    throw new ErreurFiri(message, codeVercel ?? `http_${reponse.status}`);
  }

  if (!reponse.ok) {
    throw new ErreurFiri(donnees?.erreur || "Firi a eu un problème. Réessaie.", donnees?.code);
  }
  return donnees as T;
}
