import { chargerPromptSysteme } from "./prompt";
import { normaliserAnalyse, type AnalyseDocument } from "./schema";
import { analyserAvecClaude } from "./providers/claude";
import { analyserAvecGemini } from "./providers/gemini";

export type MediaType = "image/jpeg" | "image/png" | "image/webp";

export type ImageEntree = { base64: string; mediaType: MediaType };

export type Fournisseur = "claude" | "gemini";

export function fournisseurActif(): Fournisseur {
  return process.env.AI_PROVIDER?.trim().toLowerCase() === "gemini" ? "gemini" : "claude";
}

// Choisit Claude ou Gemini selon AI_PROVIDER. L'image reste en mémoire
// le temps de la requête : rien n'est enregistré.
export async function analyserDocument(image: ImageEntree): Promise<AnalyseDocument> {
  const systeme = await chargerPromptSysteme();
  const brut =
    fournisseurActif() === "gemini"
      ? await analyserAvecGemini(image, systeme)
      : await analyserAvecClaude(image, systeme);
  return normaliserAnalyse(brut);
}
