import { analyserDocument, fournisseurActif, type MediaType } from "@/lib/analyse";

// Laisse le temps à l'IA de lire le document (Vercel).
export const maxDuration = 60;

const TYPES_ACCEPTES: MediaType[] = ["image/jpeg", "image/png", "image/webp"];
// Vercel limite le corps d'une requête à ~4,5 Mo ; l'app compresse avant l'envoi.
const TAILLE_MAX_BASE64 = 4_000_000;

function erreur(message: string, status: number) {
  return Response.json({ erreur: message }, { status });
}

export async function POST(request: Request) {
  const fournisseur = fournisseurActif();
  const cle = fournisseur === "gemini" ? process.env.GEMINI_API_KEY : process.env.ANTHROPIC_API_KEY;
  if (!cle) {
    console.error(`Clé API manquante pour le fournisseur "${fournisseur}".`);
    return erreur("Le service n'est pas encore configuré.", 500);
  }

  let image: unknown;
  try {
    ({ image } = await request.json());
  } catch {
    return erreur("Requête invalide.", 400);
  }

  // Format attendu : "data:image/jpeg;base64,...."
  const match = typeof image === "string" ? image.match(/^data:([^;]+);base64,(.+)$/) : null;
  if (!match || !TYPES_ACCEPTES.includes(match[1] as MediaType)) {
    return erreur("Image non reconnue. Essaie avec une photo.", 400);
  }
  if (match[2].length > TAILLE_MAX_BASE64) {
    return erreur("La photo est trop lourde. Réessaie.", 413);
  }

  try {
    const analyse = await analyserDocument({ mediaType: match[1] as MediaType, base64: match[2] });
    // Rien n'est stocké : la réponse part au téléphone et c'est tout.
    return Response.json(analyse, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    // On journalise seulement le message d'erreur, jamais l'image ni le contenu.
    console.error("Échec de l'analyse :", e instanceof Error ? e.message : e);
    return erreur("Firi n'a pas réussi à lire le document. Réessaie dans un instant.", 502);
  }
}
