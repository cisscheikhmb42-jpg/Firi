import { codeErreurIA } from "@/lib/erreurs";
import { repondreQuestion, type MessageConversation } from "@/lib/conversation";
import { normaliserAnalyse } from "@/lib/schema";
import type { MediaType } from "@/lib/analyse";

export const maxDuration = 60;

const TYPES_IMAGE: MediaType[] = ["image/jpeg", "image/png", "image/webp"];
// Vercel limite le corps d'une requête à ~4,5 Mo (image + audio ensemble).
const TAILLE_MAX_BASE64 = 4_200_000;
// On garde seulement les derniers échanges pour rester léger.
const HISTORIQUE_MAX = 12;

function erreur(message: string, status: number, code?: string) {
  return Response.json({ erreur: message, code }, { status });
}

function lireDataUrl(valeur: unknown) {
  const m = typeof valeur === "string" ? valeur.match(/^data:([^;,]+)(?:;[^,]*)?;base64,(.+)$/) : null;
  return m ? { mimeType: m[1], base64: m[2] } : null;
}

export async function POST(request: Request) {
  if (!process.env.GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY manquante : la conversation vocale utilise Gemini.");
    return erreur("Le service n'est pas encore configuré.", 500);
  }

  let corps: { image?: unknown; audio?: unknown; analyse?: unknown; historique?: unknown };
  try {
    corps = await request.json();
  } catch {
    return erreur("Requête invalide.", 400);
  }

  const image = lireDataUrl(corps.image);
  const audio = lireDataUrl(corps.audio);
  if (!image || !TYPES_IMAGE.includes(image.mimeType as MediaType)) {
    return erreur("Document manquant. Reprends la photo.", 400);
  }
  if (!audio || audio.mimeType !== "audio/wav") {
    return erreur("Je n'ai pas reçu ta voix. Réessaie.", 400);
  }
  if (image.base64.length + audio.base64.length > TAILLE_MAX_BASE64) {
    return erreur("Ta question est trop longue. Parle moins longtemps.", 413);
  }

  const historique: MessageConversation[] = Array.isArray(corps.historique)
    ? corps.historique.slice(-HISTORIQUE_MAX).map((m: Partial<MessageConversation>) => ({
        role: m?.role === "firi" ? "firi" : "utilisateur",
        wolof: String(m?.wolof ?? "").slice(0, 2000),
        francais: String(m?.francais ?? "").slice(0, 2000),
      }))
    : [];

  try {
    const reponse = await repondreQuestion({
      image: { mediaType: image.mimeType as MediaType, base64: image.base64 },
      analyse: normaliserAnalyse(corps.analyse),
      historique,
      audio,
    });
    // Rien n'est stocké : ni l'audio, ni l'image, ni la conversation.
    return Response.json(reponse, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    const code = codeErreurIA(e);
    console.error("Échec de la conversation [%s] :", code, e instanceof Error ? e.message : e);
    return erreur("Firi n'a pas pu répondre. Réessaie dans un instant.", 502, code);
  }
}
